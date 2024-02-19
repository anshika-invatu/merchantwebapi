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

describe('Get accountList', () => {
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
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/account-lists`, {
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

    it('should return account list doc of specified merchantID', async () => {

        const accountList = await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/account-lists`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(accountList).not.to.be.null;
        expect(accountList._id).to.be.equal(sampleAccountList._id);
    });


    after(async () => {
        await Promise.all([
            await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            await request.delete(`${process.env.LEDGERS_API_URL}/api/v1/merchants/${sampleMerchantID}/account-lists`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.LEDGERS_API_KEY
                }
            })
        ]);
    });
});