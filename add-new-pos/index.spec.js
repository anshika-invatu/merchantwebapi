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
samplePointOfService.merchantID = sampleMerchant._id;
samplePointOfService.pointOfServiceName = 'test';
samplePointOfService.pointOfServiceDescription = 'test';
let authToken = '';

describe('Add new POS', () => {
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
    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/add-new-pos', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new pos but the request body seems to be empty. Kindly pass the input parameter to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should throw error on incorrect pointOfServiceID field', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/add-new-pos', {
                body: {
                    pointOfServiceID: 123
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The pointOfServiceID field specified in the request body does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should return pos when all cases pass', async () => {
       
        const pos = await request.post(`${helpers.API_URL}/api/v1/add-new-pos`, {
            json: true,
            body: { pointOfServiceName: 'newTest',
                pointOfServiceID: samplePointOfService._id },
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
    
        expect(pos).not.to.be.null;
        expect(pos.docType).to.equal('pointOfService');
        expect(pos.merchantID).to.equal(sampleMerchant._id);
        expect(pos.pointOfServiceName).to.equal('newTest');
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