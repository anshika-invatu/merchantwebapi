'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const merchantID = uuid.v4();
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
const sampleMerchants = { ...require('../spec/sample-docs/Merchants'), _id: merchantID };
samplePointOfService.partitionKey = merchantID;
samplePointOfService.merchantID = merchantID;
samplePointOfService.isOpenForSale = true;
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';


describe('Update POS Status', () => {
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


    it('should throw error on incorrect pointOfServiceID field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/set-pos-open-for-sale-status/123`, {
                json: true,
                body: {
                    status: true
                },
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


    it('should throw 404 error if the documentId is invalid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/set-pos-open-for-sale-status/${uuid.v4()}`, {
                body: { status: true },
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

    it('should throw 404 error if the documentId is invalid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/set-pos-open-for-sale-status/${samplePointOfService._id}?status=${true}`, {
                body: {
                    status: true
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
                description: 'The POS is already set OpenForSale true',
                reasonPhrase: 'AlreaySetStatus'
            };

            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }
    });

    it('should update document when all validation passes(with status true)', async () => {

        await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        samplePointOfService.isOpenForSale = false;
        const url = `${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/point-of-services`;
        await request.post(url, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: samplePointOfService
        });
        await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            },
            body: sampleMerchants
        });
        const result = await request.patch(`${helpers.API_URL}/api/v1/set-pos-open-for-sale-status/${samplePointOfService._id}`, {
            body: {
                status: true
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result.description).to.eql('Successfully set pos status open/close for sale.');
        const pointOfService = await request.get(`${process.env.DEVICE_API_URL}/api/v1/point-of-service/${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        expect(pointOfService.isOpenForSale).to.eql(true);

    });

    it('should update document when all validation passes(with status false)', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/set-pos-open-for-sale-status/${samplePointOfService._id}`, {
            body: {
                status: false
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result.description).to.eql('Successfully set pos status open/close for sale.');

        const pos = await request.get(`${process.env.DEVICE_API_URL}/api/v1/point-of-service/${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        expect(pos.isOpenForSale).to.eql(false);
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
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchants._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

});