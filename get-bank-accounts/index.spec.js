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

describe('Get merchant payout bank accounts', () => {
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

    it('should throw error if merchantId not linked to user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/bank-accounts/${uuid.v4()}`, {
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

    it('should return payout bank accounts', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/bank-accounts/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result.payoutBankAccounts).instanceof(Array).and.have.lengthOf(2);
        expect(result.payoutBankAccounts[0].account).to.equal(sampleMerchant.payoutBankAccounts[0].account);
        expect(result.payoutBankAccounts[1].account).to.equal(sampleMerchant.payoutBankAccounts[1].account);

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