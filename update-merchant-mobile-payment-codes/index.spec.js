'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchantID = uuid.v4();
const mobilePaymentCodeID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchantMobilePaymentCodes = { ...require('../spec/sample-docs/MerchantMobilePaymentCodes'), _id: uuid.v4(), merchantID: sampleMerchantID, partitionKey: sampleMerchantID };
let authToken = '';
sampleMerchantMobilePaymentCodes.mobilePaymentCodes = [
    {
        'mobilePaymentCodeID': mobilePaymentCodeID,
        'productID': uuid.v4(),
        'productName': 'Yellow product',
        'webshopID': uuid.v4(),
        'webshopName': '',
        'isEnabledForSale': true,
        'issueVouchers': true,
        'doActions': false,
        'dynamicAmountAllowed': false,
        'useMerchantPaymentProviderAccount': false,
        'paymentProviderID': uuid.v4(),
        'paymentProvider': 'Swish',
        'paymentProviderType': 'mobile',
        'paymentProviderAccount': '+461212312332'
    }
];
sampleMerchantMobilePaymentCodes._ts = new Date();
sampleMerchantMobilePaymentCodes.ttl = 60 * 15;

describe('Update Merchant Mobile PaymentCodes', () => {
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
        await request.post(`${helpers.API_URL}/api/v1/merchant-mobile-payment-codes`, {
            body: sampleMerchantMobilePaymentCodes,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${123}/merchant-mobile-payment-codes`, {
                body: {},
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

    it('should throw error if request body is empty', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/merchant-mobile-payment-codes`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to update a merchantMobilePaymentCode but the request body seems to be empty. Kindly specify the merchantMobilePaymentCode properties to be updated using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should update mobilePaymentCodeID doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/merchant-mobile-payment-codes`, {
            body: { mobilePaymentCodes: []},
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.eql({ description: 'Successfully updated the document' });
        const result1 = await request
            .get(`${process.env.PRODUCT_API_URL}/api/v1/merchants/${sampleMerchantMobilePaymentCodes.merchantID}/merchant-mobile-payment-codes`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            });
        expect(result1).not.to.be.null;
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