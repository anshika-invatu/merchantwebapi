'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const merchantID = uuid.v4();
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleCustomers = { ...require('../spec/sample-docs/Customers'), _id: uuid.v4() };
let authToken = '';

describe('Get Orders by customer', () => {

    before(async () => {
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: merchantID,
            merchantName: 'Test'
        });

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

        sampleCustomers.merchantID = sampleUser.merchants[0].merchantID;
        await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/customers`, {
            json: true,
            body: sampleCustomers,
            headers: {
                'Authorization': authToken
            }
        });
    });


    it('should throw error if user not login', async () => {
        try {
            const url = `${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/retail-transaction/${uuid.v4()}`;
            await request.get(url, {
                json: true
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

    it('should throw error if id not in uuid format', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/123/retail-transaction/123`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The customer id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }

    });

    it('should throw error if the documentId is invalid', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/retail-transaction/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The customer id specified in the URL doesn\'t exist.',
                reasonPhrase: 'CustomerNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }

    });

    it('should throw error if the documentId is invalid', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/retail-transaction/${sampleCustomers._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'This user is not able to access to this customer.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
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
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/customers/${sampleCustomers._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });
});