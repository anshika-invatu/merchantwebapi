'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleWebshop = { ...require('../spec/sample-docs/Webshop'), _id: uuid.v4() };
let authToken = '';

describe('Delete Webshop', () => {
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
        sampleWebshop.ownerMerchantID = sampleMerchant._id;

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
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/webshops', {
            body: sampleWebshop,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw error on incorrect id field', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/webshops/123-abc`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The webshop id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 404 error if the documentId is invalid', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/webshops/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The webshop id specified in the URL doesn\'t exist.',
                reasonPhrase: 'WebShopNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should delete the document when all validation passes', async () => {
        const webshop = await request
            .delete(`${helpers.API_URL}/api/v1/webshops/${sampleWebshop._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(webshop).not.to.be.null;
        expect(webshop).to.eql({ description: 'Successfully deleted the specified webshop' });

        // Get document
        try {
            await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/webshops/${sampleWebshop._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        } catch (error) {
            expect(error.statusCode).to.equal(404);
        }
    });

    after(async () => {
        await Promise.all([
            request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            })
        ]);
    });
});