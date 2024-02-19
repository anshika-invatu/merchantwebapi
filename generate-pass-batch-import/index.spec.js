'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const passToken1 = uuid.v4();
const passToken2 = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
let authToken = '';

describe('generate-pass-batch-import', () => {
    before(async () => {
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });
        sampleProduct.issuer.merchantID = sampleMerchant._id;
        sampleProduct.issuer.merchantName = sampleMerchant.merchantName;

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
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/generate-pass-batch-import', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new passes but the request body seems to be empty. Kindly pass the request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('return error if product not present in db', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/generate-pass-batch-import', {
                body: {
                    passTokenCount: 2,
                    merchantID: sampleMerchant._id,
                    passTokens: [passToken1, passToken2],
                    webshopToken: uuid.v4(),
                    productID: uuid.v4()
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
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

    it('create passes if all conditions pass', async () => {
        const result = await request.post(helpers.API_URL + '/api/v1/generate-pass-batch-import', {
            body: {
                passTokenCount: 2,
                merchantID: sampleMerchant._id,
                passTokens: [passToken1, passToken2],
                webshopToken: uuid.v4(),
                productID: sampleProduct._id
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result[0].passToken).to.equal(passToken1);
        expect(result[1].passToken).to.equal(passToken2);
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        const url1 = `${process.env.PASSES_API_URL}/api/${process.env.PASSES_API_VERSION}/passes?passToken=${passToken1}`;
        const passes1 = await request.get(url1, {
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });
        await request.delete(`${process.env.PASSES_API_URL}/api/v1/passes/${passes1[0]._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });
        const url2 = `${process.env.PASSES_API_URL}/api/${process.env.PASSES_API_VERSION}/passes?passToken=${passToken2}`;
        const passes2 = await request.get(url2, {
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });
        await request.delete(`${process.env.PASSES_API_URL}/api/v1/passes/${passes2[0]._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });
        await request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
    });
});