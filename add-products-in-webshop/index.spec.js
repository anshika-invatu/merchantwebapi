'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const merchantID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleWebshop = { ...require('../spec/sample-docs/Webshop'), _id: uuid.v4() };
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
let authToken = '';
sampleUser.merchants[0].merchantID = merchantID;
sampleWebshop.ownerMerchantID = merchantID;
sampleUser.merchants[0].roles = 'admin';

const product = {
    'productID': uuid.v4(),
    'productName': 'The green product',
    'productDescription': 'Some description of the Product',
    'conditions': 'Some text about special conditions in text about how to use the voucher',
    'imageURL': 'https://media.vourity.com/greenburger.png',
    'isEnabledForSale': true,
    'issuer': {
        'merchantName': 'Vasamuseet'
    },
    'salesPrice': 123456789.00,
    'vatPercent': 25.00,
    'vatAmount': 2.35,
    'vatClass': 'VAT1',
    'currency': 'SEK',
    'salesPeriodStart': '2017-10-16T00:00:00Z',
    'salesPeriodEnd': '2017-10-16T00:00:00Z'
};

describe('add-partner-network-products', () => {

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

        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/webshops', {
            body: sampleWebshop,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
       
    });

    it('should return status code 400 when productID not send in input req', async () => {
        try {
            const url = helpers.API_URL + '/api/v1/add-products-in-webshop';
            await request.post(url, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide productID and merchantID, merchantID and webshopID in the req body.',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
            
        }
    });

    it('should throw error on incorrect _id field', async () => {
        sampleProduct._id = product.productID;
        sampleProduct.partitionKey = product.productID;

        await request.post(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products`, {
            json: true,
            body: sampleProduct,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });

        try {
            product.issuer.merchantID = merchantID;
            await request.post(helpers.API_URL + '/api/v1/add-products-in-webshop', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {
                    webshopID: '123',
                    productID: sampleProduct._id,
                    merchantID: merchantID
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The webshop id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);

            await request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            });
        }
    });

    it('should add product when all validation passes', async () => {

        sampleProduct._id = product.productID;
        sampleProduct.partitionKey = product.productID;

        await request.post(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products`, {
            json: true,
            body: sampleProduct,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });


        product.issuer.merchantID = merchantID;
        const result = await request.post(helpers.API_URL + '/api/v1/add-products-in-webshop', {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: {
                webshopID: sampleWebshop._id,
                productID: sampleProduct._id,
                merchantID: merchantID
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully added the product'
        });
      
        await request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/webshops/${sampleWebshop._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});