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
const sampleCustomers = { ...require('../spec/sample-docs/Customers'), _id: uuid.v4() };
let authToken = '';


sampleUser.merchants = [{
    merchantID: merchantID,
    roles: 'admin'
}];


describe('Check PageLink', () => {
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

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/check-page-link`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to check pagelink for bookingWeb but the request body seems to be empty. Kindly specify pageLink and countryCode field using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/check-page-link`, {
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

    it('should return  when all validation passes', async () => {
        sampleCustomers.merchantID = sampleUser.merchants[0].merchantID;
        const result = await request.post(`${helpers.API_URL}/api/v1/check-page-link`, {
            json: true,
            body: {
                pageLink: 'testing',
                countryCode: 'se'
            },
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.isExist).not.to.be.null;
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