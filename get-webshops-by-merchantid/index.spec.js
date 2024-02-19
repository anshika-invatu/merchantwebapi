'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleWebshop1 = { ...require('../spec/sample-docs/Webshop'), _id: uuid.v4() };
const sampleWebshop2 = { ...require('../spec/sample-docs/Webshop'), _id: uuid.v4() };
const merchantID1 = uuid.v4();
const merchantID2 = uuid.v4();
let authToken = '';

describe('Get Webshops By MerchantID', () => {
    before(async () => {
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: merchantID1

        });
        sampleUser.merchants.push({
            merchantID: merchantID2
        });
        sampleUser.mobilePhone = '+463213123347';
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

        sampleWebshop1.ownerMerchantID = merchantID1;
        sampleWebshop2.ownerMerchantID = merchantID1;
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/webshops', {
            body: sampleWebshop1,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/webshops', {
            body: sampleWebshop2,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw 404 error on merchant do not have any webshops', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID2}/webshops`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The merchant id specified in the URL doesn\'t have any webshop.',
                reasonPhrase: 'WebShopNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 401 error if the merchant id provided is not exist in user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/webshops`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Webshop not accessible to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should return the webshops linked to the merchantid', async () => {
        const webshops = await request
            .get(`${helpers.API_URL}/api/v1/merchants/${merchantID1}/webshops`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(webshops).not.to.be.null;
        expect(webshops).to.be.instanceOf(Array).and.have.lengthOf(2);
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/webshops/${sampleWebshop1._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/webshops/${sampleWebshop2._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});