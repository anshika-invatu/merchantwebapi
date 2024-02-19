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
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
const samplePOSFeatures = { ...require('../spec/sample-docs/POSFeatures'), _id: uuid.v4() };
samplePointOfService.merchantID = sampleMerchant._id;
samplePointOfService.pointOfServiceName = 'test';
samplePointOfService.pointOfServiceDescription = 'test';
samplePOSFeatures.pointOfServiceID = samplePointOfService._id;
let authToken = '';

describe('Get Pos Feature', () => {
    before(async () => {
        
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });

        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY,
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
       
        await request.post(process.env.DEVICE_API_URL + '/api/' + process.env.DEVICE_API_VERSION + '/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });
    it('should return error when pointOfServiceID not in uuid', async () => {
        try {
            await request.get(helpers.API_URL + '/api/v1/pos-feature/123', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The pointOfServiceID field specified in the request url does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should throw error on incorrect pointOfServiceID field', async () => {
        try {
            await request.get(helpers.API_URL + `/api/v1/pos-feature/${uuid.v4()}`, {
               
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The point-of-service of specified details in the URL doesn\'t exist.',
                reasonPhrase: 'PointOfServiceNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should return pos when all cases pass', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/pos-feature/${samplePointOfService._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The id specified in the URL doesn\'t exist.',
                reasonPhrase: 'PosFeaturesNotFoundError'
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
        await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${sampleMerchant._id}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });
});