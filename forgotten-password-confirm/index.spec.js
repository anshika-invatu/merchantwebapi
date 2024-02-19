'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4() };
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
sampleUser.email = email;

describe('forgotten-password-confirm', () => {

    before(async () => {
        sampleUser.partitionKey = sampleUser._id;
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.post(`${helpers.API_URL}/api/v1/forgot-pass`, {
            json: true,
            body: {
                'email': sampleUser.email
            },
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY
            }
        });
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/forgotten-password-confirm`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to reset password but the request body seems to be empty. Kindly pass the new password and resetRequestID in request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when Doc is not present in database', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/forgotten-password-confirm`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY
                },
                body: {
                    resetRequestID: uuid.v4(),
                    newPassword: 'newTest@123'
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'Request failed',
                reasonPhrase: 'PasswordResetRequestError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should return status code 400 when request body is not have resetRequestID and newPassword fields', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/forgotten-password-confirm`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY
                },
                body: {}
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide resetRequestID and newPassword fields in the request body',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
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