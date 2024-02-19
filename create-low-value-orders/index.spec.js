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
const merchantID = uuid.v4();
const webshopID = uuid.v4();
const productID = uuid.v4();


const requestBody = {
    merchantID: merchantID,
    webshopID: webshopID,
    productID: productID,
    sendDate: new Date(),
    receiversList: [
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },
        {
            email: email,
            mobilePhone: '+9123456987'
        },]
};

describe('Create Low Value Order', () => {
    before(async () => {
        sampleUser.merchants = [{
            merchantID: merchantID
        }];
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

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/low-value-orders`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new low value order but the request body seems to be empty. Kindly pass request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/low-value-orders`, {
                json: true,
                body: {},
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

    it('should return error when some fields are missing', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/low-value-orders`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {
                    merchantID: merchantID,
                    webshopID: webshopID,
                    productID: productID,
                    sendDate: new Date()
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a low value order but all parameters (merchantID, webshopID, productID, sendDate and receiversList) are not present in req body.',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error if req body have more than 10 element in receiversList', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/low-value-orders`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: requestBody
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Maximum 10 receiver element(email and mobilePhone) send in receiversList at a time.',
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