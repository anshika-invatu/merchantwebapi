'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
let authToken = '';

describe('Get invoice list', () => {
    beforeEach(async () => {
        sampleUser.merchants = new Array({ merchantID: sampleMerchant._id });
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
        sampleMerchant.payoutFrequency = 'weekly';
        sampleMerchant.pspAccount = `cus.test12${randomString}`;
        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should throw error if merchantId not linked to user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/invoices`, {
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

    it('should throw error if date range provided in query string not valid', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/invoices?fromDate=2018-08-10&toDate=20788-12-145`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid daterange in format YYYY-MM-DD.',
                reasonPhrase: 'FieldValidationError'
            };

            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if date range provided in query string are more than 2 yres before from now', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/invoices?fromDate=2015-08-10&toDate=2018-10-12`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please dont provide daterange of more than 2 yrs before from now',
                reasonPhrase: 'FieldValidationError'
            };

            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if customerID provided in query string not belong to specified merchantID', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/invoices?customerID=cus_test${randomString}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'CustomerId not belongs to this merchant',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if merchant customerID not registered on stripe', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/invoices?customerID=${sampleMerchant.pspAccount}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'This Merchant not registered on stripe',
                reasonPhrase: 'InvoiceNotFoundError'
            };

            
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if specified invoiceID not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/invoice-details?invoiceID=abc-123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'Invoice of specified Id not exist',
                reasonPhrase: 'InvoiceNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    afterEach(async () => {
        await Promise.all([
            await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            })
        ]);
    });
});