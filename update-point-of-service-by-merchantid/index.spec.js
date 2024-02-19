'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const sampleMerchantID = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const pointOfServiceSample = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4(), docType: 'pointOfService' };
sampleUser.merchants = [];
sampleUser.merchants.push({
    merchantID: sampleMerchantID,
});
const samplePointOfService = Object.assign(
    {},
    pointOfServiceSample,
    {
        merchantID: sampleUser.merchants[0].merchantID,
        partitionKey: sampleUser.merchants[0].merchantID
    });
let authToken = '';

describe('Update point-of-service', () => {
    before('', async () => {

        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
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

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to update a point-of-service but the request body seems to be empty. Kindly specify the point-of-service properties to be updated using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should throw 404 error if the document_merchantId is invalid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/point-of-services`, {
                body: Object.assign({}, samplePointOfService, { merchantID: uuid.v4() }),
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'MerchantId linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should update the document when all validation passes', async () => {

        const pointOfService = await request
            .patch(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
                body: {
                    'pointOfServiceDescription': 'The other POS mohit',
                    'deviceHardwareID': 'FTHY-F345-FF6715-xyz'
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    authorization: authToken
                }
            });

        expect(pointOfService).not.to.be.null;
        expect(pointOfService).to.eql({ description: 'Successfully updated the document' });
    });

    after('', async () => {

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

    });
});