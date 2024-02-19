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

describe('Delete Payment Provider Accounts', () => {

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


    it('should throw error on incorrect _id field', async () => {
        try {
            await request.delete(helpers.API_URL + '/api/v1/payment-provider-accounts/123', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The id field specified in the request url does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error when payment-provider-account not exist', async () => {
        try {
            await request.delete(helpers.API_URL + `/api/v1/payment-provider-accounts/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The payment provider accounts id specified in the URL doesn\'t exist.',
                reasonPhrase: 'PaymentProviderAccountsNotFoundError'
            };
            
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should delete document when all validation passes', async () => {
       
        await request.post(helpers.API_URL + '/api/v1/payment-provider-accounts', {
            body: samplePaymentProviderAccounts,
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        const result = await request.delete(helpers.API_URL + `/api/v1/payment-provider-accounts/${samplePaymentProviderAccounts._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully deleted the specified doc');
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