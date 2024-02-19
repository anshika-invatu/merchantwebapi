'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomStringNew = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantEmail = `test.${randomStringNew}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePrice = { ...require('../spec/sample-docs/PricePlan'), _id: uuid.v4() };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4(), email: merchantEmail };
let authToken = '';

samplePrice.currency = sampleMerchant.merchantCurrency;
samplePrice.country = sampleMerchant.countryCode;

describe('Create Merchant', () => {
    before(async () => {
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
        await request.post(`${process.env.MERCHANT_API_URL}/api/v1/priceplans`, {
            json: true,
            body: samplePrice,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You have requested to create merchant but the request body seems to be empty. Kindly pass the merchant fields using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants`, {
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

    it('should create merchant document when all validation passes', async () => {
        const merchant = await request.post(`${helpers.API_URL}/api/v1/merchants`, {
            json: true,
            body: sampleMerchant,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY,
                'Authorization': authToken
            }
        });


        expect(merchant).not.to.be.null;
        expect(merchant._id).to.equal(sampleMerchant._id);
        expect(merchant.docType).to.equal('merchants');
        expect(merchant.pspEmail).to.be.equal(sampleMerchant.email);

        const balanceAccounts = await request.get(`${process.env.VOUCHER_API_URL}/api/v1/merchants/${sampleMerchant._id}/balance-accounts`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        expect(balanceAccounts).not.to.be.null;
        expect(balanceAccounts[0].issuerMerchantID).to.equal(sampleMerchant._id);
        expect(balanceAccounts[1].issuerMerchantID).to.equal(sampleMerchant._id);
        expect(balanceAccounts[2].issuerMerchantID).to.be.equal(sampleMerchant._id);
        expect(balanceAccounts[3].issuerMerchantID).to.be.equal(sampleMerchant._id);
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/priceplans/${samplePrice._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should create merchant document when all validation passes', async () => {
        sampleMerchant.merchantCurrency = 'AE';
        const merchant = await request.post(`${helpers.API_URL}/api/v1/merchants`, {
            json: true,
            body: sampleMerchant,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY,
                'Authorization': authToken
            }
        });


        expect(merchant).not.to.be.null;
        expect(merchant._id).to.equal(sampleMerchant._id);
        expect(merchant.docType).to.equal('merchants');
        expect(merchant.pspEmail).to.be.equal(sampleMerchant.email);

        const balanceAccounts = await request.get(`${process.env.VOUCHER_API_URL}/api/v1/merchants/${sampleMerchant._id}/balance-accounts`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        expect(balanceAccounts).not.to.be.null;
        expect(balanceAccounts[0].issuerMerchantID).to.equal(sampleMerchant._id);
        expect(balanceAccounts[1].issuerMerchantID).to.equal(sampleMerchant._id);
        expect(balanceAccounts[2].issuerMerchantID).to.be.equal(sampleMerchant._id);
        expect(balanceAccounts[3].issuerMerchantID).to.be.equal(sampleMerchant._id);

    });



    after(async () => {
        var balanceAccounts;
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        balanceAccounts = await request.get(`${process.env.VOUCHER_API_URL}/api/v1/merchants/${sampleMerchant._id}/balance-accounts`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${balanceAccounts[0]._id}?merchantID=${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${balanceAccounts[1]._id}?merchantID=${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${balanceAccounts[2]._id}?merchantID=${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${balanceAccounts[3]._id}?merchantID=${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.delete(`${process.env.LEDGERS_API_URL}/api/v1/merchants/${sampleMerchant._id}/account-lists`, {
            json: true,
            headers: {
                'x-functions-key': process.env.LEDGERS_API_KEY
            }
        });
       
    });
});