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

let ocpiCredentialID;
describe('Update OcpiCredential', () => {
    before(async () => {
        sampleUser.merchants = [{ merchantID: sampleMerchant._id, roles: 'admin' }];

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
        const ocpiCredential = await request.post(`${helpers.API_URL}/api/v1/ocpi-credential`, {
            body: {
                merchantID: sampleMerchant._id,
                integrationID: sampleIntegrations._id
            },
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        ocpiCredentialID = ocpiCredential._id;
    });

    it('should update doc when all validation pass', async () => {

        const response = await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/ocpi-credential/${ocpiCredentialID}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                merchantName: 'testing merchantName'
            }
        });
        expect(response).not.to.null;
        expect(response.description).to.equal('Successfully updated the specified ocpiCredentials');

        await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/ocpi-credential/${ocpiCredentialID}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

    });

    it('should throw 401 error if the documentId is not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/ocpi-credential/${uuid.v4()}`, {
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

    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/integration/${sampleIntegrations._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

    });
});