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


describe('check Out', () => {
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
    it('should throw 404 error if the doc of specified id not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/check-out`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    bookingID: uuid.v4(),
                    merchantID: merchantID
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The booking details specified doesn\'t exist.',
                reasonPhrase: 'BookingNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 404 error if the doc of specified id not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/check-out`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    bookingID: sampleBookings._id,
                    merchantID: merchantID
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The booking id specified in the URL doesn\'t exist.',
                reasonPhrase: 'BookingNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if merchant id not exist', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/check-out`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {
                    bookingID: sampleBookings._id
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Please send merchantID in req body.',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(401);
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
        await request.delete(`${helpers.API_URL}/api/v1/bookings/${sampleBookings._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });
});