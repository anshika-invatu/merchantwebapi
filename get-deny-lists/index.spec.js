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
const sampleDenyLists = { ...require('../spec/sample-docs/DenyLists'), _id: uuid.v4() };
sampleDenyLists.partitionKey = sampleDenyLists._id;
let authToken = '';

describe('Get deny lists', () => {

    before(async () => {

        sampleDenyLists.merchantID = merchantID;
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
        await request.post(`${helpers.API_URL}/api/v1/deny-list`, {
            body: sampleDenyLists,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });


    it('should throw error on incorrect id field', async () => {
        
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/deny-lists`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result[0]).to.eql(undefined);
    });


    it('should return the document when all validation passes', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/deny-lists`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result[0]._id).to.equal(sampleDenyLists._id);
    });

    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/deny-list/${sampleDenyLists._id}`, {
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