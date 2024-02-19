'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const merchantID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleAccounts = { ...require('../spec/sample-docs/Accounts'), _id: uuid.v4() };
sampleAccounts.partitionKey = sampleAccounts._id;
sampleAccounts.accountName = 'test';
let authToken = '';

describe('Search accounts', () => {

    before(async () => {

        sampleAccounts.merchantID = merchantID;
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

        await request.post(`${helpers.API_URL}/api/v1/accounts`, {
            body: sampleAccounts,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

    });

    it('should get doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/search-accounts`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                accountName: 'test'
            }
        });
        expect(result).not.to.be.null;
        expect(result[0].docType).to.be.equal('accounts');

    });

    after(async () => {

        await request.delete(`${process.env.BILLING_SERVICE_API_URL}/api/v1/merchants/${merchantID}/accounts/${sampleAccounts._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
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