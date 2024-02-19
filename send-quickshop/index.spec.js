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

describe('Send quickshop', () => {
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
    });

    
    it('should throw error if the id is not uuid', async () => {
        try {
            await request.post(helpers.API_URL + `/api/v1/merchants/${uuid.v4()}/send-quickshop`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to send quickshop but the request body seems to be empty. Kindly pass the request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should send quickshop when all validation passes', async () => {
        
        const result = await request.post(helpers.API_URL + `/api/v1/merchants/${uuid.v4()}/send-quickshop`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: {
                email: 'test@test.com',
                messageText: 'testing quickshop = '
            }
        });
        expect(result).not.to.be.null;
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});