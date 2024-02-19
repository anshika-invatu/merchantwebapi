'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const merchantID = uuid.v4();
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
const pointOfServiceID = samplePointOfService._id;

let authToken = '';

describe('change-availability', () => {

    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
        sampleUser.merchants[0].roles = 'user';
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
        
        samplePointOfService.merchantID = merchantID;
        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });


    it('should throw error if user not login', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/change-availability`, {
                json: true
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if pointOfServiceID and availability not provided', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/change-availability`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide pointOfServiceID and availability in req body',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if availability is not valid format', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/change-availability`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: uuid.v4(),
                    availability: 'test'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide Inoperative or Operative as availability in req body',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if pointOfServiceID is not UUID v4 format', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/change-availability`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: '123',
                    availability: 'Operative'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The pointOfServiceID field specified in the req body does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if merchantID is not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/change-availability`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: pointOfServiceID,
                    availability: 'Operative'
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

            sampleUser.merchants[0].roles = 'admin';
            await request.patch(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
                body: {
                    merchants: sampleUser.merchants
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });

        }
    });

    it('should throw error if PointOfService Doc have not protocolCode', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/change-availability`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: pointOfServiceID,
                    availability: 'Operative'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'PointOfService Doc have not protocolCode',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
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
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });


});