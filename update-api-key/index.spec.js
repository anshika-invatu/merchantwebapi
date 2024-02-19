'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleAPIKey = { ...require('../spec/sample-docs/APIKey'), _id: uuid.v4(), merchantID: sampleMerchantID };
let authToken = '';

describe('Update apiKey', () => {
    before(async () => {
        sampleUser.merchants = new Array({ merchantID: sampleMerchantID, roles: 'admin' });
        sampleAPIKey.merchantID = sampleMerchantID;
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
        await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/api-key`, {
            body: sampleAPIKey,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/api-key/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'This Merchant is not linked to the login user',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if id is invalid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/api-key/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The apiKeyID specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should delete apiKey doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/api-key/${sampleAPIKey._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                apiKeyName: 'testing key'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.be.equal('Successfully updated the specified apiKey');
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/api-key/${sampleAPIKey._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});