'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleAccountList = { ...require('../spec/sample-docs/AccountList'), _id: uuid.v4(), merchantID: sampleMerchantID, partitionKey: sampleMerchantID };
let authToken = '';

describe('Update accountList', () => {
    before(async () => {
        sampleUser.merchants = new Array({ merchantID: sampleMerchantID });
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
        await request.post(process.env.LEDGERS_API_URL + '/api/v1/account-lists', {
            body: sampleAccountList,
            json: true,
            headers: {
                'x-functions-key': process.env.LEDGERS_API_KEY
            }
        });
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/account-lists`, {
                body: {
                    countryCode: 'DK',
                },
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

    it('should throw error if request body is empty', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/account-lists`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to update a account list but the request body seems to be empty. Kindly specify account list fields to be updated using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should update account list doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/account-lists`, {
            body: {
                countryCode: 'DK',
            },
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully updated the document'
        });
        const accountList = await request.get(`${process.env.LEDGERS_API_URL}/api/v1/merchants/${sampleMerchantID}/account-lists`, {
            json: true,
            headers: {
                'x-functions-key': process.env.LEDGERS_API_KEY
            }
        });
        expect(accountList).not.to.be.null;
        expect(accountList._id).to.be.equal(sampleAccountList._id);
        expect(accountList.countryCode).to.be.equal('DK');

    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.LEDGERS_API_URL}/api/v1/merchants/${sampleMerchantID}/account-lists`, {
            json: true,
            headers: {
                'x-functions-key': process.env.LEDGERS_API_KEY
            }
        });
    });
});