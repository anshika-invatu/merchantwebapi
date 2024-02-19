'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMobilePaymentCodes = { ...require('../spec/sample-docs/MobilePaymentCode'), _id: uuid.v4() };
sampleMobilePaymentCodes.partitionKey = sampleMobilePaymentCodes._id;
let authToken = '';

describe('Get Mobile PaymentCodes', () => {
    before(async () => {
        sampleUser.merchants = new Array({ merchantID: sampleMerchantID });
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
        const url = `${process.env.PRODUCT_API_URL}/api/v1/mobile-payment-codes`;
        await request.post(url, {
            body: sampleMobilePaymentCodes,
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
    });

    it('should create mobilePaymentCodeID doc when all validation pass', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/mobile-payment-codes/${sampleMobilePaymentCodes._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.be.equal(sampleMobilePaymentCodes._id);
    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.PRODUCT_API_URL}/api/v1/mobile-payment-codes/${sampleMobilePaymentCodes._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
    });
});