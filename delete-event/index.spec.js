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
const sampleEvents = { ...require('../spec/sample-docs/Events v2'), _id: uuid.v4() };
sampleEvents.partitionKey = sampleEvents._id;
let authToken = '';

describe('Delete Event', () => {

    before(async () => {

        sampleEvents.merchantID = merchantID;
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
        await request.post(`${process.env.MAINTENANCE_API_URL}/api/${process.env.MAINTENANCE_API_VERSION}/event`, {
            body: sampleEvents,
            json: true,
            headers: {
                'x-functions-key': process.env.MAINTENANCE_API_KEY
            }
        });
    });

    it('should throw error if id is not uuid.', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/event/123-abc`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The event id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should delete doc when all validation pass', async () => {

        const result = await request.delete(`${helpers.API_URL}/api/v1/event/${sampleEvents._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully deleted the specified event.');
    });
    
    it('should not delete doc when module not exist', async () => {

        try {
            await request.delete(`${helpers.API_URL}/api/v1/event/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The event id specified in the URL doesn\'t exist.',
                reasonPhrase: 'EventsV2NotFoundError'
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
       
    });
});