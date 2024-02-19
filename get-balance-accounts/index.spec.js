'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleBalanceAccount = { ...require('../spec/sample-docs/BalanceAccount'), _id: uuid.v4(), balanceAccountType: 'balance', issuerMerchantID: sampleMerchant._id, balanceCurrency: 'SEK' };
sampleBalanceAccount.ownerID = sampleMerchant._id;
let authToken = '';

describe('Get balance accounts', () => {
    before(async () => {
        sampleUser.merchants = new Array({ merchantID: sampleMerchant._id });
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const token = await request.post(process.env.USER_API_URL + '/api/v1/login', {
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

        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.post(`${helpers.API_URL}/api/v1/balance-accounts`, {
            body: sampleBalanceAccount,
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

    });

    it('should throw error if merchantId not linked to user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/balance-accounts/${sampleBalanceAccount._id}?merchantID=${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'This merchantId not linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if blance_id is not present in this merchant.', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/balance-accounts/${uuid.v4()}?merchantID=${sampleBalanceAccount.issuerMerchantID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'This balance account not found in this merchant',
                reasonPhrase: 'BalanceAccountNotLinkedError'
            };
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });


    it('should throw error if merchantID qurey field is empty', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/balance-accounts/${sampleBalanceAccount._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide merchantID field in request query url.',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should get balance account if all velidation pass', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/balance-accounts/${sampleBalanceAccount._id}?merchantID=${sampleBalanceAccount.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.eql(sampleBalanceAccount._id);
        
    });

    after(async () => {

        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${sampleBalanceAccount._id}?merchantID=${sampleBalanceAccount.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY,
                'Authorization': authToken
            }
        });

    });
});