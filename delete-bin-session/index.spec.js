
'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleBinSessions = { ...require('../spec/sample-docs/BinSessions'), _id: uuid.v4() };
let authToken = '';

describe('Delete Bin Session', () => {

    before(async () => {
        
        sampleUser.merchants[0].merchantID = merchantID;
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const token = await request.post(process.env.USER_API_URL + '/api/v1/login', {
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
        sampleBinSessions.merchantID = merchantID;
        await request.post(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/bin-session`, {
            body: sampleBinSessions,
            json: true,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });
    });

    it('should delete doc when all validation pass', async () => {

        const response = await request.delete(`${helpers.API_URL}/api/v1/bin-session/${sampleBinSessions._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(response).not.to.null;
        expect(response.description).to.eql('Successfully deleted the specified bin session');

    });

    it('should throw 401 error if the documentId is not linked to user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/bin-session/${uuid.v4()}`, {
                json: true,
                headers: {}
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    after(async () => {

        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

    });
});
