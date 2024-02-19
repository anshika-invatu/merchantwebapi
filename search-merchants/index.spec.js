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
const sampleMerchant1 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
sampleMerchant.merchantName = 'TestData';
sampleMerchant.partitionKey = sampleMerchant._id;
sampleMerchant.isEnabled = true;
sampleMerchant.invoiceAddress = [{
    streetRow1: 'Mega street 5',
    streetRow2: 'Mega street 5',
    zip: '12233JJHH',
    city: 'Stockholm',
    state: 'NYC',
    country: 'Sweden',
    invoiceEmail: 'test.user@vourity.com',
    invoicePhonee: +46701234567890
},
{
    streetRow1: 'Mega street 5',
    streetRow2: 'Mega street 5',
    zip: '12233JJHH',
    city: 'Stockholm1',
    state: 'NYC',
    country: 'Sweden',
    invoiceEmail: 'test.user@vourity.com',
    invoicePhonee: +46701234567890
},
{
    streetRow1: 'Mega street 5',
    streetRow2: 'Mega street 5',
    zip: '12233JJHH',
    city: 'Stockholm',
    state: 'NYC',
    country: 'Sweden',
    invoiceEmail: 'test.user@vourity.com',
    invoicePhonee: +46701234567890
}
];
let authToken = '';

describe('Search Merchants', () => {
    before(async () => {
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
        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should return the merchants if valid  merchantName  are provided for search', async () => {
        const merchants = await request
            .get(`${helpers.API_URL}/api/v1/search-merchants?merchantName=${sampleMerchant.merchantName}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        expect(merchants).not.to.be.null;
        expect(merchants).to.be.instanceOf(Array).and.not.have.lengthOf(0);
    });

    it('should return the merchant if valid  merchant ID  are provided for search', async () => {
        const merchant = await request
            .get(`${helpers.API_URL}/api/v1/search-merchants?id=${sampleMerchant._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        expect(merchant).not.to.be.null;
        expect(merchant).to.be.instanceOf(Array).and.not.have.lengthOf(0);
    });

    it('should not return merchant if invalid  merchant ID or merchantName are provided for search', async () => {
        const merchant = await request
            .get(`${helpers.API_URL}/api/v1/search-merchants?id=${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        expect(merchant).not.to.be.null;
        expect(merchant).to.be.instanceOf(Array).and.have.lengthOf(0);
    });

    it('should not return merchant isEnabled field is false', async () => {
        sampleMerchant1.isEnabled = false;
        sampleMerchant1.partitionKey = sampleMerchant1._id;
        await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
            body: sampleMerchant1,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY,
                'Authorization': authToken
            }
        });
        const merchant = await request
            .get(`${helpers.API_URL}/api/v1/search-merchants?id=${sampleMerchant1._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        expect(merchant).to.be.instanceOf(Array).and.have.lengthOf(0);
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant1._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should return the merchants if optional parameter city is provided for search', async () => {
        const merchants = await request
            .get(`${helpers.API_URL}/api/v1/search-merchants?id=${sampleMerchant._id}&city=Stockholm`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        expect(merchants).not.to.be.null;
        expect(merchants).to.be.instanceOf(Array).and.not.have.lengthOf(0);
        expect(merchants[0].invoiceAddress[0].city).to.eql('Stockholm');
        expect(merchants[0].invoiceAddress[1].city).to.eql('Stockholm');
    });
    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});