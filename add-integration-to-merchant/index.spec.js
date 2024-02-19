'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';

describe('add-integration-to-merchant', () => {

    before(async () => {
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

    });

    it('should return error when doc not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/integration-templates`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to add integration to merchant request but the request body seems to be empty. Kindly pass request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should return error when doc not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/integration-templates`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: { integrationTemplateID: uuid.v4(),
                    merchantID: uuid.v4(),
                    merchantName: 'testMerchant' }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Issuer merchantID not linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should return error when doc not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/integration-templates`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: { integrationTemplateID: uuid.v4(),
                    merchantID: sampleUser.merchants[0].merchantID,
                    merchantName: 'testMerchant' }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The Integration Template id specified in the URL doesn\'t exist.',
                reasonPhrase: 'IntegrationTemplateNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
        
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});