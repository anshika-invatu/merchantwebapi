'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchantPricePlan = { ...require('../spec/sample-docs/MerchantPricePlan'), _id: uuid.v4(), merchantID: uuid.v4() };
let authToken = '';
sampleUser.merchants = [];
sampleUser.merchants.push({
    merchantID: sampleMerchantPricePlan.merchantID
});


describe('Get Merchant Price Plan', () => {

    before(async () => {
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
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchant-priceplan', {
            body: sampleMerchantPricePlan,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });


    it('should throw error if merchant not match with user\'s merchant' , async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/merchant-priceplan`, {
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

    it('should return the merchantPricePlan if all casses pass', async () => {
        const result =  await request
            .get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantPricePlan.merchantID}/merchant-priceplan`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        expect(result._id).to.equal(sampleMerchantPricePlan._id);
        expect(result.merchantID).to.eql(sampleMerchantPricePlan.merchantID);

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