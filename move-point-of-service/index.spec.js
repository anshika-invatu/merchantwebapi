'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
const sampleMerchants = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleBusinessUnits = { ...require('../spec/sample-docs/BusinessUnits'), _id: uuid.v4() };

let authToken = '';

describe('move points of service', () => {
    before(async () => {
        samplePointOfService.merchantID = uuid.v4();
        samplePointOfService.partitionKey = samplePointOfService.merchantID;
        sampleBusinessUnits.merchantID = sampleMerchants._id;
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants', {
            body: sampleMerchants,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        
        sampleBusinessUnits.merchantID = sampleMerchants._id;
        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchants._id,
            merchantName: sampleMerchants.merchantName,
            roles: 'admin'
        });
        sampleUser.merchants.push({
            merchantID: samplePointOfService.merchantID,
            merchantName: samplePointOfService.merchantName,
            roles: 'admin'
        });
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
        
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/business-units', {
            body: sampleBusinessUnits,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/merchants/123-abc/move-point-of-service', {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to move a point-of-service but the request body seems to be empty. Kindly specify the request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
        
    });

    it('should throw error on requst body is not completed', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${'123-abc'}/move-point-of-service`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: uuid.v4(),
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide the point of service id and moveToMerchantID',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on incorrect id field', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${'123-abc'}/move-point-of-service`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: uuid.v4(),
                    moveToMerchantID: uuid.v4()
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


    it('should return the document when all validation passes', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/move-point-of-service`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                pointOfServiceID: samplePointOfService._id,
                moveToMerchantID: sampleMerchants._id
            }
        });

        expect(result).not.to.be.null;
        expect(result.description).to.eql('Successfully move point of service.');
    });

    after(async () => {
        
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        }),
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchants._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        }),
      
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${sampleBusinessUnits._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});