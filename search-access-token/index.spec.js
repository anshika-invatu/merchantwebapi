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
const sampleAccessToken = { ...require('../spec/sample-docs/AccessToken'), _id: uuid.v4() };
sampleAccessToken.partitionKey = sampleAccessToken._id;
let authToken = '';
sampleAccessToken.accessTokenName = 'test';

describe('Search AccessToken', () => {

    before(async () => {

        sampleAccessToken.issuedByMerchantID = merchantID;
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

    });


    it('should return doc when all validation pass', async () => {
        await request.post(`${helpers.API_URL}/api/v1/access-token`, {
            body: sampleAccessToken,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/search-access-token`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {}
        });
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array);
        
    });

    it('should return the document when all validation passes with all params', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/search-access-token`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                walletID: sampleAccessToken.walletID,
                email: sampleAccessToken.contact.email,
                mobilePhone: sampleAccessToken.contact.mobilePhone,
                accessTokenName: 'test' }
        });
        
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array);

    });


    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/access-token/${sampleAccessToken._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
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