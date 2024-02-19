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
let authToken = '';
sampleBalanceAccount.ownerID = sampleMerchant._id;


describe('Create balance accounts', () => {
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
            await request.post(`${helpers.API_URL}/api/v1/balance-accounts`, {
                body: Object.assign({}, sampleBalanceAccount, { issuerMerchantID: uuid.v4() }),
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

    it('should throw error req body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/balance-accounts`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a balance account but the request body seems to be empty. Kindly specify balance account fields to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if balance account already exist with same balanceCurrency in merchant doc', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/balance-accounts`, {
                body: sampleBalanceAccount,
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 403,
                description: 'This balanceCurrency already exist with this balance account.',
                reasonPhrase: 'BalanceAccountAlreadyExistError'
            };
            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }
    });

    it('should create new balance account with balance account type', async () => {

        await request.delete(helpers.API_URL + `/api/v1/balance-accounts/${sampleBalanceAccount._id}?merchantID=${sampleBalanceAccount.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        const result = await request.post(helpers.API_URL + '/api/v1/balance-accounts', {
            body: Object.assign({}, sampleBalanceAccount, { balanceAccountType: 'balance' }),
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.eql(sampleBalanceAccount._id);

        const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        expect(merchant.balanceAccounts).not.to.be.null;
        expect(merchant.balanceAccounts[0].balanceAccountID).to.equal(sampleBalanceAccount._id);


    });

    it('should create new balance account with cashpool account type', async () => {

        await request.delete(helpers.API_URL + `/api/v1/balance-accounts/${sampleBalanceAccount._id}?merchantID=${sampleBalanceAccount.issuerMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        const result = await request.post(helpers.API_URL + '/api/v1/balance-accounts', {
            body: Object.assign({}, sampleBalanceAccount, { balanceAccountType: 'cashpool' }),
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.eql(sampleBalanceAccount._id);

        const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        expect(merchant.cashpools).not.to.be.null;
        expect(merchant.cashpools[0].balanceAccountID).to.equal(sampleBalanceAccount._id);


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