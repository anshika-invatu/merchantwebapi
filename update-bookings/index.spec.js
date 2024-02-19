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
const sampleBookings = { ...require('../spec/sample-docs/Bookings'), _id: uuid.v4() };
let authToken = '';


sampleUser.merchants = [{
    merchantID: merchantID,
    roles: 'admin'
}];


describe('Update booking', () => {
    before(async () => {
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

        sampleBookings.merchantID = sampleUser.merchants[0].merchantID;
        await request.post(`${helpers.API_URL}/api/v1/bookings`, {
            json: true,
            body: sampleBookings,
            headers: {
                'Authorization': authToken
            }
        });
       
    });

    it('should return status code 400 when id not correct', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/bookings/123-abc`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The booking id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return doc document when all validation passes', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/bookings/${sampleBookings._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                bookingName: 'test'
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully updated the specified booking'
        });

    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${helpers.API_URL}/api/v1/bookings/${sampleBookings._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });
});