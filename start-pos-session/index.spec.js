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
let authToken = '';

describe('Start pos session', () => {

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

    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/start-pos-session`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to start-pos-session but the request body seems to be empty. Kindly pass the start-pos-session to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if request body required field are missing', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/start-pos-session`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    merchantID: uuid.v4()
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'merchantID, componentID, pointOfServiceID, salesChannelName, salesChannelTypeCode, salesChannelID are required in req body.',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/start-pos-session`, {
                body: {
                    merchantID: uuid.v4(),
                    componentID: '17466752-5198-4816-9607-64714d4c98e8',
                    pointOfServiceID: '6b16dcda-91e8-4a2d-804a-fc1af88d1938',
                    salesChannelTypeCode: 'pos',
                    salesChannelID: '6b16dcda-91e8-4a2d-804a-fc1af88d1938',
                    salesChannelName: 'Öbo POS 1'
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

    it('should throw error if component does not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/start-pos-session`, {
                body: {
                    merchantID: merchantID,
                    componentID: uuid.v4(),
                    pointOfServiceID: '6b16dcda-91e8-4a2d-804a-fc1af88d1938',
                    salesChannelTypeCode: 'pos',
                    salesChannelID: '6b16dcda-91e8-4a2d-804a-fc1af88d1938',
                    salesChannelName: 'Öbo POS 1'
                },
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The Components of specified details doesn\'t exist.',
                reasonPhrase: 'ComponentsNotFoundError'
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