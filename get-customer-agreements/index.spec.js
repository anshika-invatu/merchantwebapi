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
const sampleCustomerAgreements = { ...require('../spec/sample-docs/CustomerAgreements'), _id: uuid.v4() };
let authToken = '';
sampleCustomerAgreements.merchantID = merchantID;
sampleUser.merchants = [{
    merchantID: merchantID,
    roles: 'admin'
}];


describe('Get Customer Agreement by customer id', () => {
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
        await request.post(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/customer-agreement`, {
            json: true,
            body: sampleCustomerAgreements,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/123/customer-agreements/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
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

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/customer-agreements/${uuid.v4()}`, {
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
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/customer-agreements/${sampleCustomerAgreements.parties[0].customerID}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result[0].docType).to.equal('customerAgreements');

    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/merchants/${merchantID}/customer-agreement/${sampleCustomerAgreements._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });
    });
});