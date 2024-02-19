'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const merchantID = uuid.v4();
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
samplePointOfService.partitionKey = merchantID;
samplePointOfService.merchantID = merchantID;
samplePointOfService.isOpenForSale = true;
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';


describe('Set POS Status', () => {
    before(async () => {
        const url = `${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/point-of-services`;
        await request.post(url, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: samplePointOfService
        });
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
    });

    it('should throw error when body not present.', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/set-pos-status`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to set a POS status but the request body seems to be empty. Kindly specify status using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on incorrect pointOfServiceID field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/set-pos-status`, {
                json: true,
                body: {
                    pointOfServiceID: '123',
                    statusCode: 'available'
                },
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


    it('should throw 404 error if the documentId is invalid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/set-pos-status`, {
                body: { statusCode: 'available', pointOfServiceID: uuid.v4() },
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

    it('should throw 404 error if statusCode is invalid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/set-pos-status`, {
                body: {
                    statusCode: 'test',
                    pointOfServiceID: samplePointOfService._id
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 403,
                description: 'You\'ve requested to set a POS status with wrong statusCode.',
                reasonPhrase: 'StatusCodeNotValidError'
            };

            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });

});