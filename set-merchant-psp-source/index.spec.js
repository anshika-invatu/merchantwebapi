'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant1 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };

let authToken = '';

describe('Set merchant psp source', () => {
    before(async () => {
        const merchantArray = [];
        merchantArray.push({
            merchantID: sampleMerchant1._id,
            merchantName: sampleMerchant1.merchantName
        });
        sampleUser.merchants = new Array(...merchantArray);

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

    it('should throw error on unauthenticate request', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/set-merchant-psp-source`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
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

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/set-merchant-psp-source`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide body parameters merchantID,pspSource and pspSourceSecret',
                reasonPhrase: 'EmptyRequestBodyError'
            };
           
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should throw 401 error if the merchantID is not in merchant section of user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/set-merchant-psp-source`, {
                json: true,
                body: {
                    merchantID: uuid.v4(),
                    pspSource: 'xyz',
                    pspSourceSecret: 'abc'

                },
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'user not allowed to modify this merchant',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
           
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });


    it('should throw 401 error if the user do not have admin permission', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/set-merchant-psp-source`, {
                json: true,
                body: {
                    merchantID: sampleMerchant1._id,
                    pspSource: 'xyz',
                    pspSourceSecret: 'abc'
                },
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'user not allowed to modify this merchant',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
           
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
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