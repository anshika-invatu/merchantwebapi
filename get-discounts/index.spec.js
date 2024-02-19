'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomStringNew = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantEmail = `test.${randomStringNew}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleDiscounts = { ...require('../spec/sample-docs/Discounts'), _id: uuid.v4() };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4(), email: merchantEmail };
let authToken = '';

sampleDiscounts.merchantID = sampleMerchant._id;
sampleUser.merchants = [{
    merchantID: sampleMerchant._id,
    roles: 'admin'
}];


describe('Get Discounts', () => {
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
        await request.post(`${helpers.API_URL}/api/v1/discounts`, {
            json: true,
            body: sampleDiscounts,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY,
                'Authorization': authToken
            }
        });
    });

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/discounts`, {
                json: true,
                body: {},
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                }
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

    it('should create doc document when all validation passes', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/discounts?merchantID=${sampleDiscounts.merchantID}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array).and.not.have.lengthOf(0);

    });


    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/discounts/${sampleDiscounts._id}`, {
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