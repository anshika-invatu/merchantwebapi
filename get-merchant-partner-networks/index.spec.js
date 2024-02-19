'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchantPartnerNetworks = { ...require('../spec/sample-docs/MerchantPartnerNetworks'), _id: uuid.v4() };
let authToken = '';
sampleMerchantPartnerNetworks.ownerMerchantID = sampleUser.merchants[0].merchantID;
sampleUser.merchants[0].roles = 'admin';

describe('Get Merchant Partner Network', () => {

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
    });
    

    it('should throw error on incorrect _id field', async () => {
        try {
            await request.get(helpers.API_URL + '/api/v1/merchant/123/merchant-partner-networks', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The id field specified in the request URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when document not exist', async () => {
       
        try {
            await request.get(helpers.API_URL + '/api/v1/merchant/' + uuid.v4() + '/merchant-partner-networks', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The merchantPartnerNetworks of specified details in the URL doesn\'t exist.',
                reasonPhrase: 'MerchantPartnerNetworkNotFoundError'
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
    
    });
});