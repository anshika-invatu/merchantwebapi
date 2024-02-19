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
const sampleEvseComponents = { ...require('../spec/sample-docs/EvseComponents'), _id: uuid.v4() };
const sampleConnectorComponents = { ...require('../spec/sample-docs/ConnectorComponents'), _id: uuid.v4() };
const sampleOcpiCredential = { ...require('../spec/sample-docs/OcpiCredential'), _id: uuid.v4() };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };

const merchantID = sampleMerchant._id;

samplePointOfService.merchantID = merchantID;
sampleEvseComponents.pointOfServiceID = samplePointOfService._id;
sampleEvseComponents.merchantID = merchantID;
sampleConnectorComponents.pointOfServiceID = samplePointOfService._id;
sampleConnectorComponents.merchantID = merchantID;
sampleConnectorComponents.parentComponentID = sampleEvseComponents._id;
sampleOcpiCredential.merchantID = merchantID;

let authToken = '';

describe('Create OcpiLocation from pos', () => {

    before(async () => {

        sampleUser.merchants[0].merchantID = merchantID;
        sampleUser.merchants[0].roles = 'admin';

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

        samplePointOfService.merchantID = merchantID;
        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        
        // create sample evse components
        await request.post(helpers.API_URL + '/api/v1/pos-components', {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: sampleEvseComponents
        });
        // create sample connector components
        await request.post(helpers.API_URL + '/api/v1/pos-components', {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: sampleConnectorComponents
        });
        // create ocpiCredential
        sampleOcpiCredential.tokenType = 'C';
        await request.post(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/ocpi-credential`, {
            body: sampleOcpiCredential,
            json: true,
            headers: {
                'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
            }
        });
    });
    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/ocpi-location-from-pos/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
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

    it('should throw error if pointOfService does not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/ocpi-location-from-pos/${uuid.v4()}`, {
                json: true,
                headers: {
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

    it('should throw error if merchant does not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/ocpi-location-from-pos/${samplePointOfService._id}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The merchant id specified in the URL doesn\'t exist.',
                reasonPhrase: 'MerchantNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
            // create merchant doc
            await request.post(process.env.MERCHANT_API_URL + '/api/v1/merchants', {
                body: sampleMerchant,
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        }
    });

    it('should create doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/ocpi-location-from-pos/${samplePointOfService._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.docType).to.be.equal('ocpiLocation');
        expect(result.id).to.be.equal(samplePointOfService._id);
        await request.delete(process.env.DEVICE_API_URL + `/api/v1/merchant-ocpi-location/${result._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });

    after(async () => {
        await request.delete(helpers.API_URL + `/api/v1/pos-components/${sampleConnectorComponents._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        await request.delete(helpers.API_URL + `/api/v1/pos-components/${sampleEvseComponents._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        
        await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

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
        await request.delete(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/ocpi-credential/${sampleOcpiCredential._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
            }
        });
    });
});