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
const pointOfServiceSample = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4(), docType: 'pointOfService', businessUnitID: uuid.v4(), pointOfServiceID: uuid.v4(), };
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

describe('Get Point-of-service', () => {
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

    it('should throw 404 error if the document_merchantId is invalid', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/point-of-services`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'MerchantID linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should return the document when all validation passes', async () => {
        const pointOfService = await request
            .get(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    authorization: authToken
                }
            });

        expect(pointOfService).not.to.be.null;
        expect(pointOfService).to.be.instanceOf(Array).and.have.lengthOf(1);
    });

    it('should return the document when give businessUnitID in query string', async () => {
        const pointOfService = await request
            .get(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?businessUnitID=${samplePointOfService.businessUnitID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    authorization: authToken
                }
            });

        expect(pointOfService).not.to.be.null;
        expect(pointOfService).to.be.instanceOf(Array).and.have.lengthOf(1);
    });

    it('should return the document when give pointOfServiceID in query string', async () => {
        const pointOfService = await request
            .get(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID =${samplePointOfService.pointOfServiceID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    authorization: authToken
                }
            });

        expect(pointOfService).not.to.be.null;
        expect(pointOfService).to.be.instanceOf(Array).and.have.lengthOf(1);
    });

    it('should return the document when give businessUnitID and pointOfServiceID in query string', async () => {
        const pointOfService = await request
            .get(`${helpers.API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID =${samplePointOfService.pointOfServiceID}&businessUnitID=${samplePointOfService.businessUnitID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    authorization: authToken
                }
            });

        expect(pointOfService).not.to.be.null;
        expect(pointOfService).to.be.instanceOf(Array).and.have.lengthOf(1);
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