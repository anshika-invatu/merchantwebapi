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
let authToken = '';

describe('Update accounts', () => {

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

    it('should throw error if request id is not  uuid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/123/accounts/${sampleAccounts._id}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should get doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/accounts/${sampleAccounts._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                accountName: 'test'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.be.equal('Successfully updated the specified account');

        const accounts = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/accounts/${sampleAccounts._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(accounts).not.to.be.null;
        expect(accounts.accountName).to.be.equal('test');
    });

    it('should not create doc when module does not exist', async () => {

        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/accounts/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The accounts specified details in the URL doesn\'t exist.',
                reasonPhrase: 'AccountNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
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