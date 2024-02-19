'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const productID = uuid.v4();
const merchantID = uuid.v4();
const pointOfServiceID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleCheckoutSession = { ...require('../spec/sample-docs/CheckoutSession'), _id: uuid.v4() };
sampleCheckoutSession.products[0].productID = productID;
sampleCheckoutSession.pointOfServiceID = pointOfServiceID;
sampleCheckoutSession.paymentProviderAccountID = uuid.v4();
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: merchantID };
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: productID };
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: pointOfServiceID };
samplePointOfService.merchantID = merchantID;
samplePointOfService.actions = [];
let checkoutSessionID, retailTransactionID;

describe('Refund retail transaction', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
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
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        sampleProduct.currency = samplePointOfService.currency;
        await request.post(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products`, {
            json: true,
            body: sampleProduct,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });

        await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/point-of-services`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: samplePointOfService
        });
        await request.patch(`${process.env.PRODUCT_API_URL}/api/v1/add-product-to-cart/${pointOfServiceID}`, {
            body: { productID: productID },
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        const result = await request.post(`${process.env.ORDER_API_URL}/api/v1/pay-cart`, {
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            },
            body: {
                pointOfServiceID: pointOfServiceID,
                pspType: 'creditcard',
                paymentStatus: 'approved',
                paymentTransactionResponse: {}
            }
        });
        checkoutSessionID = result.checkoutSessionID;
        const res = await request.post(process.env.ORDER_API_URL + '/api/v1/retail-transaction', {
            body: sampleCheckoutSession,
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            }
        });
        retailTransactionID = res._id;
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/refund-retail-transaction`, {
                body: {},
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

    it('should throw 404 error if the doc is not exist', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/refund-retail-transaction`, {
                body: {
                    retailTransactionID: uuid.v4(),
                    checkoutSessionID: uuid.v4(),
                    sessionID: uuid.v4(),
                    reasonForRefund: 'abc'
                },
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The RetailTransaction id specified in the URL doesn\'t exist.',
                reasonPhrase: 'RetailTransactionNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });
    
    it('should throw error if the payment provider account is not exist in req.', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/refund-retail-transaction`, {
                body: {
                    retailTransactionID: retailTransactionID,
                    reasonForRefund: 'abc',
                    checkoutSessionID: checkoutSessionID,
                    sessionID: uuid.v4()
                },
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'Payment Provider Accounts not found.',
                reasonPhrase: 'PaymentProviderNotFoundError'
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
        await request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        await request.delete(`${process.env.PRODUCT_API_URL}/api/v1/users/${pointOfServiceID}/cart`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});