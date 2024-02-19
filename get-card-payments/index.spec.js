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
const samplePaymentProviderAccounts = { ...require('../spec/sample-docs/PaymentProviderAccounts'), _id: uuid.v4() };
let authToken = '';
sampleUser.merchants[0].merchantID = merchantID;
samplePaymentProviderAccounts.merchantID = sampleUser.merchants[0].merchantID;
samplePaymentProviderAccounts.settings = {
    apiKey: 'private_xnEo8XEt3r2CaDvzCEpmZCjh'
};
samplePaymentProviderAccounts.pspType = 'creditcard';

describe('Get cart payments', () => {

    before(async () => {
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

    it('should return error when payment not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/card-payments`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Merchants not linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when payment not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleUser.merchants[0].merchantID}/card-payments`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'Payment Provider Account is missing',
                reasonPhrase: 'NoPaymentProviderFoundError'
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
        
    });
});