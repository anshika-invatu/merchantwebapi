'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const merchantID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
let authToken = '';

describe('Send Access Token', () => {

    before(async () => {
        
        sampleUser.merchants[0].merchantID = merchantID;

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

        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

    });

    it('should throw error on incorrect id field', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/send-pos-linking-code`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    merchantID: uuid.v4(),
                    pointOfServiceID: '123',
                    mobilePhone: '34324342'
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The pointOfService id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });
    it('should throw error on data not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/send-pos-linking-code`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    merchantID: uuid.v4(),
                    pointOfServiceID: uuid.v4(),
                    mobilePhone: '13225463'
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The pointOfService of specified details doesn\'t exist.',
                reasonPhrase: 'PointOfServiceNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });


    it('should return the document when all validation passes', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/send-pos-linking-code`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                merchantID: samplePointOfService.merchantID,
                pointOfServiceID: samplePointOfService._id,
                mobilePhone: '67785785',
            }
        });
        
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully send pos linking code.');
    });

    after(async () => {
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
       
    });
});