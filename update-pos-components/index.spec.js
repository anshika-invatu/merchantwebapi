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
const sampleComponents = { ...require('../spec/sample-docs/Components'), _id: uuid.v4() };
samplePointOfService.partitionKey = merchantID;
let authToken = '';
sampleComponents.pointOfServiceID = samplePointOfService._id;

describe('Update POS Components', () => {

    before(async () => {

        samplePointOfService.merchantID = merchantID;
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

        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });

    it('should throw error when _id is not correct', async () => {
        try {
            await request.patch(helpers.API_URL + `/api/v1/pos-components/${123}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: { alternateID: 'A102' }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on incorrect _id field', async () => {
        try {
            await request.patch(helpers.API_URL + `/api/v1/pos-components/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: { alternateID: 'A102' }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The components specified details in the URL doesn\'t exist.',
                reasonPhrase: 'ComponentsNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should update doc when all cases pass', async () => {

        await request.post(helpers.API_URL + '/api/v1/pos-components', {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: sampleComponents
        });

        const result = await request.patch(helpers.API_URL + `/api/v1/pos-components/${sampleComponents._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: { alternateID: 'A102' }
        });
        expect(result.description).to.equal('Successfully updated the specified components');
    });

    after(async () => {

        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/pos-components/${sampleComponents._id}`, {
            json: true,
            body: sampleUser,
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
        
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
       
    });
});