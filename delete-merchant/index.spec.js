'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomString1 = crypto.randomBytes(3).toString('hex');
const randomString2 = crypto.randomBytes(3).toString('hex');
const randomString3 = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantEmail = `test.${randomString1}@vourity.com`;
const merchantEmail2 = `test.${randomString2}@vourity.com`;
const merchantEmail3 = `test.${randomString3}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4(), email: merchantEmail };
const sampleMerchant2 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4(), email: merchantEmail2 };
const sampleMerchant3 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4(), email: merchantEmail3 };

const sampleVoucher = { ...require('../spec/sample-docs/Vouchers'), _id: uuid.v4() };
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };


let authToken = '';

describe('Delete Merchant', () => {
    before(async () => {
        sampleProduct.issuer = { merchantID: sampleMerchant._id }; // sample has product attached with it
        sampleVoucher.issuer = { merchantID: sampleMerchant3._id };

        await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants`, {
            json: true,
            body: sampleMerchant2,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants`, { //merchant linked with voucher
            json: true,
            body: sampleMerchant3,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        await request.post(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products`, {
            json: true,
            body: sampleProduct,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });

        await request.post(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers`, {
            json: true,
            body: sampleVoucher,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        sampleUser.merchants = [];
        sampleUser.merchants.push({ merchantID: sampleMerchant._id, merchantName: sampleMerchant.merchantName, roles: 'admin,write' });
        sampleUser.merchants.push({ merchantID: sampleMerchant2._id, merchantName: sampleMerchant2.merchantName, roles: 'view,write' }); //not given admin permission for sample merchant 2
        sampleUser.merchants.push({ merchantID: sampleMerchant3._id, merchantName: sampleMerchant3.merchantName, roles: 'admin,write' });// voucher linked to this merchant

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
        await request.post(`${helpers.API_URL}/api/v1/merchants/`, { //merchant web api call in order to create stripe for deletion
            json: true,
            body: sampleMerchant,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
    });

    it('should return error code 401 when merchant not linked to the user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'User not allowed to delete this merchant',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
                json: true,
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

    it('should throw error when user not have admin permission to delete merchant', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant2._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'User not allowed to delete this merchant',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should not delete and throw error when try to delete merchant which has voucher linked with it', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant3._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 403,
                description: 'Voucher linked to this merchant',
                reasonPhrase: 'VouchersLinkedError'
            };

            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }

        //checking merchant not deleted
        const merchantResult = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant3._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        expect(merchantResult).not.to.be.null;
        expect(merchantResult._id).not.to.be.undefined;
    });

    it('should delete merchant which do not have voucher linked also delete its products,buisnessunit etc', async () => {

        const result = await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.eql({ code: 200, description: 'Successfully deleted the specified merchant' });

        try {
            await request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
                json: true,
                body: sampleProduct,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The product id specified in the URL doesn\'t exist.',
                reasonPhrase: 'ProductNotFoundError'
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
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant2._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant3._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        await request.delete(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers/${sampleVoucher._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });

    });
});