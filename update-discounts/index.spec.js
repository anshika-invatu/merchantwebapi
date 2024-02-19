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


describe('Update Discounts', () => {
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

    it('should return status code 400 when id is not in uuid format', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/discounts/123`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
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

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/discounts/${uuid.v4()}`, {
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

    it('should throw error when data does not exist', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/discounts/${uuid.v4()}`, {
                json: true,
                body: {},
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The discount id specified in the URL doesn\'t exist.',
                reasonPhrase: 'DiscountNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });


    it('should create doc document when all validation passes', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/discounts/${sampleDiscounts._id}`, {
            json: true,
            body: { discountName: 'test' },
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully updated the specified discount');

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