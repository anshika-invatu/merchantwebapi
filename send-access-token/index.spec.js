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

describe('Send Access Token', () => {

    before(async () => {
        sampleAccessToken.accessTokenType = 'qr';
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

    it('should throw error on incorrect id field', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/send-access-token`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    merchantID: uuid.v4(),
                    accessTokenID: '123',
                    email: 'test@test.com'
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
    it('should throw error on data not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/send-access-token`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    merchantID: uuid.v4(),
                    accessTokenID: uuid.v4(),
                    email: 'test@test.com'
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The access token of specified details doesn\'t exist.',
                reasonPhrase: 'AccessTokenNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });


    it('should return the document when all validation passes', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/send-access-token`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                merchantID: sampleAccessToken.adminRights[0].merchantID,
                accessTokenID: sampleAccessToken._id,
                email: 'test@test.com'
            }
        });
        
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully send accessToken');
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