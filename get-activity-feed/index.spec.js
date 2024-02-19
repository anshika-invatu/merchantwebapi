'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';

describe('Get Activity Feeds', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
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

    it('return error when user is not loggedin', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/get-activity-feed`, {
                json: true,
                headers: {},
                body: {}
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

    it('should throw error if merchantID is not passed', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/get-activity-feed`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide merchantID field in request body',
                reasonPhrase: 'FieldValidationError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should throw error if merchantID is not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/get-activity-feed`, {
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
                code: 401,
                description: 'MerchantID not linked to user',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should get doc when all validation pass', async () => {
        var result = await request.post(`${helpers.API_URL}/api/v1/get-activity-feed`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                merchantID: merchantID
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array);
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