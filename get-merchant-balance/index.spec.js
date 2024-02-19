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
const sampleBalanceAccount1 = { ...require('../spec/sample-docs/BalanceAccount'), _id: uuid.v4(), balanceAccountType: 'balance', issuerMerchantID: sampleMerchant._id, balanceCurrency: 'SEK' };
const sampleBalanceAccount2 = { ...require('../spec/sample-docs/BalanceAccount'), _id: uuid.v4(), balanceAccountType: 'balance', issuerMerchantID: sampleMerchant._id, balanceCurrency: 'INR' };
const sampleBalanceAccount3 = { ...require('../spec/sample-docs/BalanceAccount'), _id: uuid.v4(), balanceAccountType: 'balance', issuerMerchantID: sampleMerchant._id, balanceCurrency: 'SEK1' };
let authToken = '';
sampleBalanceAccount1.ownerID = sampleMerchant._id;
sampleBalanceAccount2.ownerID = sampleMerchant._id;
sampleBalanceAccount1.ownerType = 'merchant';
sampleBalanceAccount2.ownerType = 'merchant';

describe('Get merchant balance', () => {
    beforeEach(async () => {
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
        sampleMerchant.walletAmount = 45678.9;
        sampleMerchant.walletCurrency = 'EUR';
        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.post(`${helpers.API_URL}/api/v1/balance-accounts`, {
            body: sampleBalanceAccount1,
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        await request.post(`${helpers.API_URL}/api/v1/balance-accounts`, {
            body: sampleBalanceAccount2,
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        await request.post(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/balance-accounts`, {
            body: sampleBalanceAccount3,
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
    });

    it('should throw error if merchantId not linked to user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchant-balance/${uuid.v4()}`, {
                json: true,
                headers: {
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

    it('should return merchant balance', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/merchant-balance/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result[0]._id).to.equal(sampleBalanceAccount1._id);
        expect(result[1]._id).to.equal(sampleBalanceAccount2._id);


    });

    afterEach(async () => {
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
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${sampleBalanceAccount1._id}?merchantID=${sampleBalanceAccount1.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY,
                'Authorization': authToken
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${sampleBalanceAccount2._id}?merchantID=${sampleBalanceAccount2.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY,
                'Authorization': authToken
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${sampleBalanceAccount3._id}?merchantID=${sampleBalanceAccount3.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY,
                'Authorization': authToken
            }
        });
    });
});