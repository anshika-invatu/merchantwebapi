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
const sampleSites = { ...require('../spec/sample-docs/Sites'), _id: uuid.v4() };
sampleSites.partitionKey = sampleSites._id;
let authToken = '';

describe('Get Sites', () => {

    before(async () => {

        sampleSites.ownerMerchantID = merchantID;
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
        await request.post(`${helpers.API_URL}/api/v1/sites`, {
            body: sampleSites,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/sites`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array);

        await request.delete(`${helpers.API_URL}/api/v1/sites/${sampleSites._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
       
    });
});