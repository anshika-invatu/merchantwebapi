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


describe('Update Customer', () => {
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

        sampleCustomers.merchantID = sampleUser.merchants[0].merchantID;
        await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/customers`, {
            json: true,
            body: sampleCustomers,
            headers: {
                'Authorization': authToken
            }
        });
       
    });

    it('should return status code 400 when customer id not correct', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/customers/123-abc`, {
                json: true,
                headers: {
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

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/customers/${uuid.v4()}`, {
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

    it('should return doc document when all validation passes', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/customers/${sampleCustomers._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully updated the specified customer'
        });

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