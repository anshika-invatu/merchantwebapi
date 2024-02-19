'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleBookings = { ...require('../spec/sample-docs/Bookings'), _id: uuid.v4() };
const sampleTimeSlot = { ...require('../spec/sample-docs/TimeSlot'), _id: uuid.v4() };
const sampleResource = { ...require('../spec/sample-docs/Resource'), _id: uuid.v4() };
let authToken = '';
sampleResource.partitionKey = sampleResource._id;
sampleBookings.partitionKey = sampleBookings._id;
sampleTimeSlot.partitionKey = sampleTimeSlot._id;
sampleTimeSlot.resourceID = sampleResource._id;
sampleTimeSlot.isBooked = false;
sampleTimeSlot.isEnabled = true;
sampleTimeSlot.slotFromDate = new Date('2021-03-22');
sampleTimeSlot.slotToDate = new Date('2021-03-25');
sampleTimeSlot.availableSeats = 5;
sampleBookings.resourceID = sampleResource._id;

describe('change booking dates', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = sampleMerchantID;
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
        sampleTimeSlot.merchantID = sampleMerchantID;
        await request.post(`${helpers.API_URL}/api/v1/timeslots`, {
            body: sampleTimeSlot,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        sampleResource.merchantID = sampleMerchantID;
        await request.post(`${helpers.API_URL}/api/v1/resources`, {
            body: sampleResource,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/change-booking-dates`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to change a booking dates but the request body seems to be empty. Kindly specify booking fields to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return status code 404 when booking not exist', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/change-booking-dates`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {
                    bookingID: uuid.v4()
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


    it('should create doc document when all validation passes', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/change-booking-dates`, {
            json: true,
            body: {
                bookingID: sampleBookings._id,
                fromDate: '2021-03-23',
                toDate: '2021-03-24'
            },
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Booking dates changed'
        });
    });


    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleMerchantID}/resources/${sampleResource._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/bookings/${sampleBookings._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });
    });
});