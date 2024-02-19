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
const sampleOcpiLocation = { ...require('../spec/sample-docs/OcpiLocation'), _id: uuid.v4() };
let authToken = '';

describe('Update OcpiLocation', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
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
        sampleOcpiLocation.merchantID = merchantID;
        await request.post(`${helpers.API_URL}/api/v1/ocpi-location`, {
            body: sampleOcpiLocation,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should update doc when all validation pass', async () => {

        const response = await request.patch(`${helpers.API_URL}/api/v1/merchants/${merchantID}/ocpi-location/${sampleOcpiLocation._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                city: 'testing city'
            }
        });
        expect(response).not.to.null;
        expect(response.description).to.equal('Successfully updated the specified ocpiLocation');

        await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/ocpi-location/${sampleOcpiLocation._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

    });

    it('should throw 401 error if the documentId is not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/ocpi-location/${uuid.v4()}`, {
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

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

    });
});