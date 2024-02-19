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

describe('Import AccessToken from csv', () => {

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
        await request.post(`${helpers.API_URL}/api/v1/access-token`, {
            body: sampleAccessToken,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });


    it('should return doc when all validation pass', async () => {
       
        const result = await request.post(`${helpers.API_URL}/api/v1/import-access-tokens-from-csv`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                merchantID: sampleUser.merchants[0].merchantID,
                importFileBase64Blob: 'ImFjY2Vzc1Rva2VuIiwibmFtZSIsInRva2VuVHlwZSIKIkFCQzEyMyIsIk1hcmsgVHdhaW4iLCJyZmlkIgoiREVGNDU1NyIsIkxpc2EgVHdhaW4iLCJxciIKIkVSVDk5ODMiLCJOaWNlIHBlcnNvbiIsImF1dG9jaGFyZ2UiCgo='
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully import accessToken from csv file');

       
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