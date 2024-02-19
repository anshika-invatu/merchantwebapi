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
const sampleEventSubscribers = { ...require('../spec/sample-docs/EventSubscribers'), _id: uuid.v4() };
sampleEventSubscribers.partitionKey = sampleEventSubscribers._id;
let authToken = '';

describe('Update Event Subscriber', () => {

    before(async () => {

        sampleEventSubscribers.merchantID = merchantID;
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

        await request.post(`${process.env.MAINTENANCE_API_URL}/api/${process.env.MAINTENANCE_API_VERSION}/event-subscriber`, {
            body: sampleEventSubscribers,
            json: true,
            headers: {
                'x-functions-key': process.env.MAINTENANCE_API_KEY
            }
        });

    });

    it('should update doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/event-subscriber/${sampleEventSubscribers._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                name: 'testing'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.be.equal('Successfully updated the specified eventSubscriber.');
    });
    it('should throw error on incorrect id field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/event-subscriber/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The eventSubscribers id specified in the request does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });
    it('should not update doc when module not exist', async () => {

        try {
            await request.patch(`${helpers.API_URL}/api/v1/event-subscriber/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The eventSubscribers id specified in the URL doesn\'t exist.',
                reasonPhrase: 'EventSubscribersNotFoundError'
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
        await request.delete(`${process.env.MAINTENANCE_API_URL}/api/${process.env.MAINTENANCE_API_VERSION}/event-subscriber/${sampleEventSubscribers._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MAINTENANCE_API_KEY
            }
        });
    });
});