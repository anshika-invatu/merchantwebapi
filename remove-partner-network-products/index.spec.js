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
const samplePartnerNetwork = { ...require('../spec/sample-docs/PartnerNetwork'), _id: uuid.v4() };
const sampleProduct = { ...require('../spec/sample-docs/Products'), _id: uuid.v4() };
let authToken = '';
sampleUser.merchants[0].merchantID = merchantID;
samplePartnerNetwork.ownerMerchantID = merchantID;
sampleUser.merchants[0].roles = 'admin';
samplePartnerNetwork.partnerNetworkMembers = [{
    merchantID: merchantID,
    merchantName: 'Turistbutiken i Åre',
    commissionAmount: 18.50,
    commissionPercent: 5.00,
    currency: 'SEK',
    roles: 'admin'
}];
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

describe('remove-partner-network-products', () => {

    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
        samplePartnerNetwork.partnerNetworkMembers[0].merchantID = merchantID;
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

        samplePartnerNetwork.products = [];
        samplePartnerNetwork.products.push(product);
        await request.post(process.env.VOUCHER_API_URL + `/api/${process.env.USER_API_VERSION}/partner-networks`, {
            body: samplePartnerNetwork,
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
       
    });

    
 
    it('should throw error on incorrect _id field', async () => {
        try {
            product.issuer.merchantID = merchantID;
            await request.delete(helpers.API_URL + `/api/v1/remove-partner-network-products/${123}?merchantID=${merchantID}&productID=${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: product
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The partnerNetworkID field specified in the request URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error when query fields are not provided', async () => {
        try {
            product.issuer.merchantID = merchantID;
            await request.delete(helpers.API_URL + `/api/v1/remove-partner-network-products/${123}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: product
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide merchantID and productID of product',
                reasonPhrase: 'FieldValidationError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error when given merchant not linked with this user', async () => {
        try {
            product.issuer.merchantID = merchantID;
            await request.delete(helpers.API_URL + `/api/v1/remove-partner-network-products/${123}?merchantID=${uuid.v4()}&productID=${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: product
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Issuer merchantID not linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });


    it('should remove product when all validation passes', async () => {

        sampleProduct._id = product.productID;
        sampleProduct.partitionKey = product.productID;
        sampleProduct.collectorLimitationsPartnerNetworks = [{
            partnerNetworkID: samplePartnerNetwork._id,
            partnerNetworkName: samplePartnerNetwork.partnerNetworkName
        }];
        await request.post(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products`, {
            json: true,
            body: sampleProduct,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });


        product.issuer.merchantID = merchantID;
        const result = await request.delete(helpers.API_URL + `/api/v1/remove-partner-network-products/${samplePartnerNetwork._id}?merchantID=${merchantID}&productID=${sampleProduct._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: product
        });
        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully deleted the product'
        });
        const partnerNetworkDoc = await request.get(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/partner-networks/${samplePartnerNetwork._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        expect(partnerNetworkDoc).not.to.be.null;
        expect(partnerNetworkDoc.products).not.to.be.null;
        const productDoc = await request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${sampleProduct._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        expect(productDoc).not.to.be.null;
        expect(productDoc.collectorLimitationsPartnerNetworks).not.to.be.null;
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
        await request.delete(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/merchants/${merchantID}/partner-networks/${samplePartnerNetwork._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
    });
});