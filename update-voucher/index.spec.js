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
let authToken = '';
const pass = uuid.v4();
const utils = require('../utils');
const passToken = utils.hashToken(pass);
const sampleVoucher = { ...require('../spec/sample-docs/Vouchers'), _id: uuid.v4(), passToken: passToken.toLowerCase(), voucherToken: uuid.v4() };
sampleVoucher.issuer = {
    merchantID: merchantID,
    merchantName: 'Test'
};

describe('get-vouchers-withfilters', () => {

    before(async () => {
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: merchantID,
            merchantName: 'Test'
        });

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

        await request.post(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers`, {
            body: sampleVoucher,
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
    });


    it('should throw error if user not login', async () => {
        try {
            const url = `${helpers.API_URL}/api/v1/merchants/${merchantID}/vouchers/${sampleVoucher._id}`;
            await request.patch(url, {
                json: true
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

    it('should return doc when pass anyone input field in req body', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/vouchers/${sampleVoucher._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: {
                voucherTitle: 'test'
            }
        });
        expect(result).to.eql({ description: 'Successfully updated the document' });

    });

    after(async () => {
        
        await request.delete(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers/${sampleVoucher._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
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