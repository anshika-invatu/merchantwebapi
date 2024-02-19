'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const merchantID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchants = { ...require('../spec/sample-docs/Merchants'), _id: merchantID };
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };



const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
samplePointOfService.merchantID = merchantID;
samplePointOfService.deviceHardwareID = '';
let authToken;

describe('link-pos', () => {
    before(async () => {
        sampleUser.merchants[0] = {
            merchantID: merchantID,
            merchantName: 'Turistbutiken i Åre',
            userGroups: '',
            roles: 'admin',
            businessUnitID: uuid.v4()
        };
        const userUrl = `${process.env.USER_API_URL}/api/v1/users`;
        await request.post(userUrl, {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const posUrl = `${process.env.DEVICE_API_URL}/api/v1/point-of-services`;
        await request.post(posUrl, {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        const merchantUrl = `${process.env.MERCHANT_API_URL}/api/v1/merchants`;
        await request.post(merchantUrl, {
            body: sampleMerchants,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
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


    it('should throw 401 error if the userId provided is not of the logged in user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/link-pos`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,

                },
                body: {

                    pointOfServiceID: uuid.v4(),
                    merchantID: uuid.v4(),
                    deviceHardwareID: uuid.v4()
                }

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
    it('should throw error when merchant id not linked with this user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/link-pos`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {

                    pointOfServiceID: uuid.v4(),
                    merchantID: uuid.v4(),
                    deviceHardwareID: uuid.v4()
                }

            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Log in user not allowed to access this merchant.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should return the document when all validation passes', async () => {
        const deviceID = uuid.v4();
        const Url = `${helpers.API_URL}/api/v1/link-pos`;
        const result = await request.post(Url, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                pointOfServiceID: samplePointOfService._id,
                merchantID: merchantID,
                deviceHardwareID: deviceID
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).not.to.be.null;

      
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/point-of-service-auth/${deviceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
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
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchants._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});