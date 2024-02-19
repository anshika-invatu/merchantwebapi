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
const sampleAccountTransaction = { ...require('../spec/sample-docs/AccountTransaction'), _id: uuid.v4() };
sampleAccountTransaction.partitionKey = sampleAccountTransaction._id;
let authToken = '';
const sampleAccounts = { ...require('../spec/sample-docs/Accounts'), _id: uuid.v4() };
sampleAccounts.partitionKey = sampleAccounts._id;
sampleAccountTransaction.accountID = sampleAccounts._id;

describe('Create account transaction', () => {

    before(async () => {
        sampleAccounts.merchantID = merchantID;
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
        await request.post(`${helpers.API_URL}/api/v1/accounts`, {
            body: sampleAccounts,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/account-transactions`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new account transaction but the request body seems to be empty. Kindly pass the account transaction to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should create doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/account-transactions`, {
            body: sampleAccountTransaction,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.be.equal(sampleAccountTransaction._id);
    });

    it('should not create doc when module already exist', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/account-transactions`, {
                body: sampleAccountTransaction,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            await request.delete(`${process.env.BILLING_SERVICE_API_URL}/api/v1/merchants/${merchantID}/account-transactions/${sampleAccounts._id}?accountTransactionID=${sampleAccountTransaction._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.BILLING_SERVICE_API_KEY
                }
            });
    
            const response = {
                code: 409,
                description: 'You\'ve requested to create a new accountTransactions but a accountTransactions with the specified _id field already exists.',
                reasonPhrase: 'DuplicateAccountTransactionsError'
            };
            expect(error.statusCode).to.equal(409);
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
        await request.delete(`${process.env.BILLING_SERVICE_API_URL}/api/v1/merchants/${merchantID}/accounts/${sampleAccounts._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            }
        });
    });
});