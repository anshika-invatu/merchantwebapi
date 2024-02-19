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

describe('Get Events by merchant', () => {

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
            await request.post(`${helpers.API_URL}/api/v1/merchants/123-abc/events`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The merchant id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should get doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/merchants/${sampleEvents.merchantID}/events`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result[0].docType).to.equal('eventsV2');
    });
    
    it('should return empty array when module not exist', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/events`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result[0]).to.be.undefined;
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MAINTENANCE_API_URL}/api/${process.env.MAINTENANCE_API_VERSION}/event/${sampleEvents._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MAINTENANCE_API_KEY
            }
        });
    });
});