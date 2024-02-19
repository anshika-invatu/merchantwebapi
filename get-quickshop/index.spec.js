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
const sampleQuickShop = { ...require('../spec/sample-docs/QuickShop'), _id: uuid.v4() };
let authToken = '';
sampleQuickShop.quickShopCode = uuid.v4();

describe('Get quickshop', () => {
    before(async () => {
      
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });
        sampleQuickShop.merchantID = sampleMerchant._id;
        sampleQuickShop.adminRights[0].merchantID = sampleMerchant._id;

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
        await request.post(helpers.API_URL + '/api/v1/quickshop', {
            body: sampleQuickShop,
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
    });

    
    it('should throw error if the request body not exists', async () => {
        try {
            await request.get(helpers.API_URL + `/api/v1/merchants/${uuid.v4()}/quickshop/123`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The quickshop id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should create document when all validation passes', async () => {
        
        const result = await request.get(helpers.API_URL + `/api/v1/merchants/${sampleMerchant._id}/quickshop/${sampleQuickShop._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.eql(sampleQuickShop._id);
    });

    it('should throw error if the document not exists', async () => {
        try {
            await request.get(helpers.API_URL + `/api/v1/merchants/${sampleQuickShop.adminRights[0].merchantID}/quickshop/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The quickshop id specified in the URL doesn\'t exist.',
                reasonPhrase: 'QuickShopNotFoundError'
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
        await request.delete(helpers.API_URL + `/api/v1/merchants/${sampleMerchant._id}/quickshop/${sampleQuickShop._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
    });
});