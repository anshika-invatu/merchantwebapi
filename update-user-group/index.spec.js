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

describe('update User group', () => {

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


    it('should update doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/user-group/${sampleUserGroups._id}`, {
            json: true,
            body: { name: 'test' },
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully updated the document');
    });

    it('should not update doc when module not exist', async () => {

        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/user-group/${uuid.v4()}`, {
                body: sampleUserGroups,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
          
            const response = {
                code: 404,
                description: 'The user group id specified in the URL doesn\'t exist.',
                reasonPhrase: 'UserGroupNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
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