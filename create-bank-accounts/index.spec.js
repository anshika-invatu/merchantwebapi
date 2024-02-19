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
let authToken = '', bankAccount;

describe('Create merchant payout bank accounts', () => {
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
        bankAccount = {
            'bank': 'SEB',
            'country': 'SE',
            'currency': 'EUR',
            'accountType': 'iban',
            'account': '344542323JJJ',
            'iban': '4455522423423423AJKJJ',
            'bic': 'ESSTTEHH',
            'lastPayout': '2017-10-16T14:05:36Z'
        };
        sampleMerchant.payoutBankAccounts = [
            {
                'bank': 'SEB',
                'country': 'SE',
                'currency': 'SEK',
                'accountType': 'iban',
                'account': '1212323JJJ',
                'iban': '23422423423423AJKJJ',
                'bic': 'ESSTTEHH',
                'lastPayout': '2017-10-16T14:05:36Z'
            },
        ];
        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw error if merchantId not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/bank-accounts/${uuid.v4()}`, {
                body: { payoutBankAccount: bankAccount },
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

    it('should throw error if bank account already exist in merchant doc', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/bank-accounts/${sampleMerchant._id}`, {
                json: true,
                body: { payoutBankAccount: sampleMerchant.payoutBankAccounts[0] },
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 403,
                description: 'Bank account already exist',
                reasonPhrase: 'BankAccountAlreadyExistError'
            };

            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if account field is missing from payoutBankAccount field', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/bank-accounts/${sampleMerchant._id}`, {
                json: true,
                body: {
                    payoutBankAccount: {
                        'bank': 'SEB',
                        'country': 'SE',
                        'currency': 'SEK',
                        'accountType': 'iban',
                    }
                },
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide bank account fields with account in request body',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should create new payout bank account', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/bank-accounts/${sampleMerchant._id}`, {
            json: true,
            body: { payoutBankAccount: bankAccount },
            headers: {
                'Authorization': authToken
            }
        });
        expect(result.payoutBankAccount).to.eql(bankAccount);

        const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        expect(merchant.payoutBankAccounts).instanceof(Array).and.have.lengthOf(2);
        expect(merchant.payoutBankAccounts[0].account).to.equal(sampleMerchant.payoutBankAccounts[0].account);
        expect(merchant.payoutBankAccounts[1].account).to.equal(bankAccount.account);

    });

    afterEach(async () => {
        await Promise.all([
            await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            })
        ]);
    });
});