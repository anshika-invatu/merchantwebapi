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

describe('Get AccessToken by customer', () => {

    before(async () => {
        sampleAccessToken.customerID = uuid.v4();
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
        
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/access-token/${123}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The customerID specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }

       
    });

    it('should return the empty array when customerID does exist.', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/access-token/${uuid.v4()}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array);
        expect(result).to.eql([]);

    });

    it('should return the document when all validation passes with all params', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/access-token/${sampleAccessToken.customerID}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array);
        expect(result[0]._id).to.eql(sampleAccessToken._id);

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