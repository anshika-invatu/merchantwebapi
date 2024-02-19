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
const sampleUserGroups = { ...require('../spec/sample-docs/UserGroups'), _id: uuid.v4() };
sampleUserGroups.partitionKey = sampleUserGroups._id;
let authToken = '';

describe('Get User groups by merchant id', () => {

    before(async () => {

        sampleUserGroups.merchantID = merchantID;
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
        await request.post(`${process.env.USER_API_URL}/api/v1/merchants/${merchantID}/user-group`, {
            body: sampleUserGroups,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });


    it('should get doc when all validation pass', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/user-groups`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result[0].docType).to.be.equal('userGroups');
    });

    it('should not get doc when module not exist', async () => {

        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/user-groups`, {
                body: sampleUserGroups,
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


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/merchants/${merchantID}/user-group/${sampleUserGroups._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
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