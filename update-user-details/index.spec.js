'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email,mobilePhone: '+1234567890',country: 'SE' };
let authToken = '';

describe('Update user details', () => {
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

    it('should throw unauhtenticated error on incorrect _id field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/user-details/123`, {
                json: true,
                body: {},
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

    it('should throw error if country has invalid format', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/user-details/${sampleUser._id}`, {
                json: true,
                body: {
                    mobilePhone: '+4631233123456789',
                    country: 'sweden' // invalid format
                },
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid country in two capital letters like \'SE\'',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return success when user details changed successfully', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/user-details/${sampleUser._id}`, {
            json: true,
            body: {
                mobilePhone: '+4631233123456789',
                country: 'DK'
            },
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).to.eql({
            code: 200,
            description: 'Successfully updated the user details'
        });
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        expect(user.mobilePhone).to.be.equal('+4631233123456789');
        expect(user.country).to.be.equal('DK');
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