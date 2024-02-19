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
let authToken = '';

describe('Update merchant payout bank accounts', () => {
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
            {
                'bank': 'SEB',
                'country': 'SE',
                'currency': 'EUR',
                'accountType': 'iban',
                'account': '344542323JJJ',
                'iban': '4455522423423423AJKJJ',
                'bic': 'ESSTTEHH',
                'lastPayout': '2017-10-16T14:05:36Z'
            }
        ];
        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw error if bank account or merchantID is missing from query string', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/bank-accounts?merchantID=${sampleMerchant._id}`, {
                json: true,
                body: {
                    payoutBankAccount: {
                        'bank': 'SEB update',
                        'country': 'SE update',
                        'currency': 'SEK update',
                        'accountType': 'iban update',
                    }
                },
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide merchantID and account field in query string',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if merchantID not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/bank-accounts?merchantID=${uuid.v4()}&account=${sampleMerchant.payoutBankAccounts[1].account}`, {
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
                code: 401,
                description: 'MerchantID not linked to user',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if account not listed in payoutBankAccounts section', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/bank-accounts?merchantID=${sampleMerchant._id}&account=123`, {
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
                code: 404,
                description: 'Bank account not exist',
                reasonPhrase: 'PayoutBankAccountsNotFoundError'
            };


            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should update specified bank account', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/bank-accounts?merchantID=${sampleMerchant._id}&account=${sampleMerchant.payoutBankAccounts[1].account}`, {
            json: true,
            body: {
                payoutBankAccount: {
                    'bank': 'SEB update',
                    'country': 'SE update',
                    'currency': 'SEK update',
                    'accountType': 'iban update',
                }
            },
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).to.eql({
            code: 200,
            description: 'Successfully updated payout bank account'
        });

        const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        expect(merchant.payoutBankAccounts).instanceof(Array).and.have.lengthOf(2);
        expect(merchant.payoutBankAccounts[1].accountType).to.equal('iban update');

    });

    it('should throw error on empty request body', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/bank-accounts?merchantID=${sampleMerchant._id}&account=123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to update a bank account but the request body seems to be empty. Kindly specify bank account fields to be updated using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
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
    });
});