'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };

let authToken = '';

describe('Send set smart charging profile to ocpp16-api', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
        sampleUser.merchants[0].roles = 'admin';
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

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/send-set-smart-charging-profile`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide pointOfServiceID and smartChargingProfileID in req body',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/send-set-smart-charging-profile`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    pointOfServiceID: uuid.v4(),
                    componentID: uuid.v4(),
                    smartChargingProfileID: uuid.v4()
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

    after(async () => {

        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});