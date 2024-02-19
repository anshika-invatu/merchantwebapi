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
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: merchantID };
const sampleAccounts = { ...require('../spec/sample-docs/Accounts'), _id: uuid.v4(), merchantID: uuid.v4() };
sampleAccounts.partitionKey = sampleAccounts._id;
const sampleAccountTransaction = { ...require('../spec/sample-docs/AccountTransaction'), _id: uuid.v4(), merchantID: uuid.v4() };
sampleAccountTransaction.partitionKey = sampleAccountTransaction._id;
sampleAccountTransaction.merchantID = merchantID;
sampleAccountTransaction.accountID = sampleAccounts._id;
sampleAccountTransaction.currency = 'SEK';
sampleAccountTransaction.isCleared = false;
sampleAccounts.payers = [{
    merchantID: sampleMerchant._id
}];
sampleAccounts.payee = [{
    merchantID: sampleMerchant._id
}];
let authToken = '';
sampleUser.merchants[0].merchantID = merchantID;
sampleUser.merchants[0].roles = 'admin';

describe('Account Transactions Clearing', () => {

    before(async () => {
        sampleAccounts.adminRights[0].merchantID = merchantID;
        sampleAccounts.adminRights[0].roles = 'admin';
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
        await request.post(`${process.env.BILLING_SERVICE_API_URL}/api/${process.env.BILLING_SERVICE_VERSION}/account-transactions`, {
            body: sampleAccountTransaction,
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            }
        });
        await request.post(`${process.env.BILLING_SERVICE_API_URL}/api/${process.env.BILLING_SERVICE_VERSION}/accounts`, {
            body: sampleAccounts,
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            }
        });
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should return error when accountTransactionID not in query params.', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/account-transaction-clearing`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    accountID: uuid.v4(),
                    currency: 'SEK',
                    merchantID: uuid.v4()
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
    
    it('should return doc when all validation passes', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/account-transaction-clearing`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                accountID: sampleAccounts._id,
                currency: 'SEK',
                merchantID: merchantID
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Account Transactions Successfully cleared.');

       
    });
    after(async () => {
        
        await request.delete(`${process.env.BILLING_SERVICE_API_URL}/api/${process.env.BILLING_SERVICE_VERSION}/merchants/${sampleAccounts.adminRights[0].merchantID}/account-transactions/${sampleAccounts._id}?accountTransactionID=${sampleAccountTransaction._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            }
        });
        await request.delete(`${process.env.BILLING_SERVICE_API_URL}/api/${process.env.BILLING_SERVICE_VERSION}/merchants/${sampleAccounts.adminRights[0].merchantID}/accounts/${sampleAccounts._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            }
        });
        await request.delete(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants/' + sampleMerchant._id, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});