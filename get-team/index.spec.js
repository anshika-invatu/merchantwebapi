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
const sampleTeams = { ...require('../spec/sample-docs/Teams'), _id: uuid.v4() };
sampleTeams.partitionKey = sampleTeams._id;
let authToken = '';

describe('Get Teams', () => {

    before(async () => {

        sampleTeams.merchantID = merchantID;
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
        await request.post(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/teams`, {
            body: sampleTeams,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });

    it('should throw error if id is incorrect', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/123/team/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    name: 'test'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The merchant id field specified in the request body does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should get doc when all validation pass', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleTeams.merchantID}/team/${sampleTeams._id}`, {
            body: {
                name: 'test'
            },
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.be.equal(sampleTeams._id);
    });

    it('should not get doc when team not exist', async () => {

        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleTeams.merchantID}/team/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
    
            const response = {
                code: 404,
                description: 'The team id specified in the URL doesn\'t exist.',
                reasonPhrase: 'TeamNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/merchants/${sampleTeams.merchantID}/teams/${sampleTeams._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            },
            body: { userMerchants: [merchantID]}
        });
    });
});