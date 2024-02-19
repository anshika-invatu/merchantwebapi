'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const merchantID = uuid.v4();
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePrice = { ...require('../spec/sample-docs/PricePlan'), _id: uuid.v4() };
let authToken = '';
const randomStringNew = crypto.randomBytes(3).toString('hex');
const merchantEmail = `test.${randomStringNew}@vourity.com`;
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: merchantID, email: merchantEmail };


describe('Set Merchant Price Plan', () => {

    before(async () => {

        sampleMerchant.pricePlan = {};
        sampleMerchant.merchantCurrency = 'AE';
        delete sampleMerchant.vatNumber;
        await request.post(`${process.env.MERCHANT_API_URL}/api/v1/priceplans`, {
            json: true,
            body: samplePrice,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: merchantID,
            merchantName: sampleMerchant.merchantName
        });
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
        await request.post(`${helpers.API_URL}/api/v1/merchants`, {
            json: true,
            body: sampleMerchant,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY,
                'Authorization': authToken
            }
        });
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/set-priceplan`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide body parameters merchantID and priceplanID to update price plan in Merchant',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 401 error if user is not authenticate', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/set-priceplan`, {
                json: true,
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

    it('should update the document when all validation passes', async () => {
        const result = await request
            .post(`${helpers.API_URL}/api/v1/set-priceplan`, {
                body: { pricePlanID: samplePrice._id, merchantID: merchantID },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully updated the specified merchant price plan');
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should update the document when all validation passes', async () => {
        sampleMerchant.merchantCurrency = 'SEK';
        await request.post(`${helpers.API_URL}/api/v1/merchants`, {
            json: true,
            body: sampleMerchant,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY,
                'Authorization': authToken
            }
        });
        const result = await request
            .post(`${helpers.API_URL}/api/v1/set-priceplan`, {
                body: { pricePlanID: samplePrice._id, merchantID: merchantID },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully updated the specified merchant price plan');
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/priceplans/${samplePrice._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.delete(process.env.MERCHANT_API_URL + `/api/v1/merchants/${merchantID}/merchant-billing`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

});