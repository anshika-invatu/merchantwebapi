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
const sampleBookingWeb = { ...require('../spec/sample-docs/BookingWeb'), _id: uuid.v4() };
let authToken = '';

describe('Get BookingWebs by merchantID', () => {
    before(async () => {
        sampleBookingWeb.countryCode = 'se';
        sampleBookingWeb.pageLink = 'testing-link-test-web4';
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
        sampleBookingWeb.merchantID = merchantID;
        await request.post(`${helpers.API_URL}/api/v1/booking-web`, {
            body: sampleBookingWeb,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should get doc when all validation pass', async () => {

        const response = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/booking-webs`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(response).not.to.null;
        expect(response[0]._id).to.equal(sampleBookingWeb._id);
        
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/booking-web/${sampleBookingWeb._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/booking-webs`, {
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