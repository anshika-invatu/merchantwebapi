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
const sampleAccounts = { ...require('../spec/sample-docs/Accounts'), _id: uuid.v4() };
sampleAccounts.partitionKey = sampleAccounts._id;
let authToken = '';
const sampleAccountTransaction = { ...require('../spec/sample-docs/AccountTransaction'), _id: uuid.v4() };
sampleAccountTransaction.partitionKey = sampleAccountTransaction._id;
sampleAccountTransaction.accountID = sampleAccounts._id;
sampleAccountTransaction.isCleared = false;
sampleAccounts.isEnabled = true;
sampleAccountTransaction.transactionDate = new Date(sampleAccountTransaction.transactionDate);

describe('Register account transactions', () => {

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
        await request.post(`${helpers.API_URL}/api/v1/account-transactions`, {
            body: sampleAccountTransaction,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });


    });

    it('should throw error if request id is not  uuid', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/register-transaction`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    accountID: '123',
                    currency: sampleAccounts.currency,
                    amount: 10,
                    merchantID: uuid.v4(),
                    vatAmount: 12,
                    transactionTypeCode: 'paid',
                    description: 'test description',
                    salesChannelName: 'test',
                    salesChannelTypeCode: 'webshop'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The accountID specified in the request does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should register doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/register-transaction`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                accountID: sampleAccounts._id,
                currency: sampleAccounts.currency,
                amount: 10,
                merchantID: uuid.v4(),
                vatAmount: 12,
                transactionTypeCode: 'paid',
                description: 'test description',
                salesChannelName: 'test',
                salesChannelTypeCode: 'webshop'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.be.equal('Successfully register the specified account transaction');
    });

    it('should not register doc when module not exist', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/register-transaction`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    accountID: sampleAccounts._id,
                    currency: sampleAccounts.currency,
                    amount: 10,
                    merchantID: uuid.v4(),
                    vatAmount: 12,
                    transactionTypeCode: 'paid',
                    description: 'test description',
                    salesChannelName: 'test',
                    salesChannelTypeCode: 'webshop'
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The accounts specified details in the URL doesn\'t exist.',
                reasonPhrase: 'AccountNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
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
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/account-transactions/${sampleAccounts._id}?accountTransactionID=${sampleAccountTransaction._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
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