'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
let authToken = '';
const sampleMerchantID = uuid.v4();
let newProductID;
describe('Copy Product', () => {
    before(async () => {
        
        sampleUser.merchants = new Array({ merchantID: sampleMerchantID });
        sampleProduct.issuer.merchantID = sampleMerchantID;
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const token = await request.post(process.env.USER_API_URL + '/api/v1/login', {
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
        await request.post(process.env.PRODUCT_API_URL + '/api/v1/products', {
            body: sampleProduct,
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
    });

    it('should return copy product doc when all validation pass', async () => {
        const response = await request.post(`${helpers.API_URL}/api/v1/copy-product/${sampleProduct._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(response).not.to.null;
        expect(response._id).not.to.equal(sampleProduct._id);
        newProductID = response._id;
    });

    it('should throw 404 error if the productID is not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/copy-product/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
           
            const response = {
                code: 404,
                description: 'The product id specified in the URL doesn\'t exist.',
                reasonPhrase: 'ProductNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    after(async () => {
        await Promise.all([
            await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            await request.delete(`${process.env.PRODUCT_API_URL}/api/v1/products/${sampleProduct._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            }),
            await request.delete(`${process.env.PRODUCT_API_URL}/api/v1/products/${newProductID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            })
        ]);
    });
});