'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const Promise = require('bluebird');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
const sampleProduct2 = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
const sampleProduct3 = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
sampleProduct.issuer.merchantID = uuid.v4();
sampleProduct2.issuer.merchantID = uuid.v4();
sampleProduct3.issuer.merchantID = uuid.v4();
let authToken = '';

describe('Get Products By UserID', () => {
    before(async () => {
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleProduct.issuer.merchantID,
            merchantName: sampleProduct.issuer.merchantName
        });
        sampleUser.merchants.push({
            merchantID: sampleProduct2.issuer.merchantID,
            merchantName: sampleProduct2.issuer.merchantName
        });
        sampleUser.merchants.push({
            merchantID: sampleProduct3.issuer.merchantID,
            merchantName: sampleProduct3.issuer.merchantName
        });
        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const token = await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/login', {
            body: {
                email: sampleUser.email,
                password: sampleUser.password
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        authToken = token.token;
        await request.post(process.env.PRODUCT_API_URL + '/api/' + process.env.PRODUCT_API_VERSION + '/products', {
            body: sampleProduct,
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        await request.post(process.env.PRODUCT_API_URL + '/api/' + process.env.PRODUCT_API_VERSION + '/products', {
            body: sampleProduct2,
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        await request.post(process.env.PRODUCT_API_URL + '/api/' + process.env.PRODUCT_API_VERSION + '/products', {
            body: sampleProduct3,
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
    });

    it('should throw error on incorrect id field', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/users/123-abc/products`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 401 error if the user id provided is invalid', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/users/${uuid.v4()}/products`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should return the products linked to the userid', async () => {
        const products = await request
            .get(`${helpers.API_URL}/api/v1/users/${sampleUser._id}/products`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(products).not.to.be.null;
        expect(products).to.be.instanceOf(Array).and.have.lengthOf(3);
    });

    after(async () => {
        await Promise.all([
            request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            }),
            request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct2._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            }),
            request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct3._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            })
        ]);
    });
});