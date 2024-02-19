'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleIntegrations = { ...require('../spec/sample-docs/Integrations'), _id: uuid.v4() };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4(), email: email };

let authToken = '';

describe('Create OcpiCredential', () => {

    before(async () => {
        sampleUser.merchants = [{ merchantID: sampleMerchant._id, roles: 'admin' }];

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
        sampleIntegrations.adminRights = [{ merchantID: sampleMerchant._id, roles: 'admin' }];
        await request.post(`${helpers.API_URL}/api/v1/integration`, {
            body: sampleIntegrations,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/ocpi-credential`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please send MerchantID and integrationID in req body.',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should create doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/ocpi-credential`, {
            body: {
                merchantID: sampleMerchant._id,
                integrationID: sampleIntegrations._id
            },
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.merchantID).to.be.equal(sampleMerchant._id);
        expect(result.integrationID).to.be.equal(sampleIntegrations._id);
    });

    it('should return error when invalid merchantID', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/ocpi-credential`, {
                body: {
                    merchantID: uuid.v4(),
                    integrationID: sampleIntegrations._id
                },
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'MerchantID not linked to user',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when invalid integrationID', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/ocpi-credential`, {
                body: {
                    merchantID: sampleMerchant._id,
                    integrationID: uuid.v4()
                },
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The integrations id specified in the URL doesn\'t exist.',
                reasonPhrase: 'IntegrationsNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/integration/${sampleIntegrations._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});