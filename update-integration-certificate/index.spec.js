'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const merchantID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleIntegrations = { ...require('../spec/sample-docs/Integrations'), _id: uuid.v4() };
sampleIntegrations.partitionKey = sampleIntegrations._id;
let authToken = '';

describe('Update integration certificate', () => {

    before(async () => {

        
        sampleUser.merchants[0].merchantID = merchantID;

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
        
        sampleIntegrations.adminRights[0].merchantID = merchantID;
        await request.post(`${helpers.API_URL}/api/v1/integration`, {
            body: sampleIntegrations,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should update integration doc when all validation pass', async () => {
        
        const result = await request.patch(`${helpers.API_URL}/api/v1/integration-certificate`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                integrationID: sampleIntegrations._id,
                merchantID: sampleIntegrations.adminRights[0].merchantID,
                certBlob: 'dGVzdA==',
                certName: 'test',
                certDescription: 'test des',
                certPassword: 'dGVzdA==',
                endpoint: 'primary'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.be.equal('Successfully updated the specified integration certificate');

    });

    it('should not update integration when db don\'t have integration with this id.', async () => {

        try {
            await request.patch(`${helpers.API_URL}/api/v1/integration-certificate`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    integrationID: uuid.v4(),
                    merchantID: uuid.v4(),
                    certBlob: 'dGVzdA==',
                    certName: 'test',
                    certDescription: 'test des',
                    certPassword: 'dGVzdA==',
                    endpoint: 'primary'
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

    it('should return error when id is not in uuid format', async () => {
       
        try {
            await request.patch(`${helpers.API_URL}/api/v1/integration-certificate`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    integrationID: '123',
                    merchantID: uuid.v4(),
                    certBlob: 'dGVzdA==',
                    certName: 'test',
                    certDescription: 'test des',
                    certPassword: 'dGVzdA==',
                    endpoint: 'primary'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The integrations id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
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
       
    });
});