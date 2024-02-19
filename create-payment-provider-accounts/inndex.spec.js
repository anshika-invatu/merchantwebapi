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
const samplePaymentProviderAccounts = { ...require('../spec/sample-docs/PaymentProviderAccounts'), _id: uuid.v4() };
let authToken = '';
sampleUser.merchants[0].merchantID = merchantID;
samplePaymentProviderAccounts.merchantID = merchantID;
sampleUser.merchants[0].roles = 'admin';

describe('Create Payment Provider Accounts', () => {

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
            await request.post(helpers.API_URL + '/api/v1/payment-provider-accounts', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new payment provider accounts but the request body seems to be empty. Kindly pass the payment provider accounts to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
            
        }
    });

    it('should throw error on incorrect _id field', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/payment-provider-accounts', {
                body: {
                    _id: 123,
                    merchantID: merchantID
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
                description: 'The _id field specified in the request body does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should create document when all validation passes', async () => {
       
        const result = await request.post(helpers.API_URL + '/api/v1/payment-provider-accounts', {
            body: samplePaymentProviderAccounts,
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.equal(samplePaymentProviderAccounts._id);
        expect(result.docType).to.equal('paymentProviderAccounts');
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(process.env.PAYMENT_API_URL + `/api/v1/payment-provider-accounts/${samplePaymentProviderAccounts._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PAYMENT_API_KEY
            },
            body: { userMerchants: [merchantID]}
        });
    });
});