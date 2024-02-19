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

describe('Update user language', () => {
    before(async () => {
       
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
    });

    it('should throw error on empty request body', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/language/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You have requested to update user language but the request body seems to be empty. Kindly pass the languageCode and languageName fields using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 401 error if the userId provided is not of the logged in user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/language/${uuid.v4()}`, {
                body: {
                    languageCode: 'en-US',
                    languageName: 'English'
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if language code do not have ISO format', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/language/${sampleUser._id}`, {
                body: {
                    languageCode: 'abcd-123',
                    languageName: 'English'
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide language code in ISO format',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should update the user language when all validation passes', async () => {
        const response = await request
            .patch(`${helpers.API_URL}/api/v1/language/${sampleUser._id}`, {
                body: {
                    languageCode: 'en-US',
                    languageName: 'English'
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(response).not.to.be.null;
        expect(response).to.deep.equal({
            code: 200,
            description: 'Successfully updated the language'
        });

        //checking if language upadated
        const user = await request.get(process.env.USER_API_URL + `/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        expect(user).not.to.be.null;
        expect(user.languageCode).to.equal('en-US');
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