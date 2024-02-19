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
const sampleEventTypesMapping = { ...require('../spec/sample-docs/EventTypesMapping'), _id: uuid.v4() };
sampleEventTypesMapping.partitionKey = sampleEventTypesMapping._id;
let authToken = '';

describe('Update Event Type Mapping', () => {

    before(async () => {

        sampleEventTypesMapping.merchantID = merchantID;
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
        await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/event-type-mapping`, {
            body: sampleEventTypesMapping,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });
    it('should throw error if id is not uuid', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/event-type-mapping/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The _id field specified in the request does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });
    it('should update doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/event-type-mapping/${sampleEventTypesMapping._id}`, {
            body: {
                name: 'testingDoc'
            },
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully updated the specified eventTypeMapping');
    });
    
    it('should not get doc when module not exist', async () => {

        try {
            await request.patch(`${helpers.API_URL}/api/v1/event-type-mapping/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The eventTypeMapping specified details in the URL doesn\'t exist.',
                reasonPhrase: 'EventTypeMappingNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
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
        await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/event-type-mapping/${sampleEventTypesMapping._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });
});