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
const sampleTimeSlot = { ...require('../spec/sample-docs/TimeSlot'), _id: uuid.v4() };
const sampleResource = { ...require('../spec/sample-docs/Resource'), _id: uuid.v4() };
let authToken = '';
sampleResource.partitionKey = sampleResource._id;
sampleTimeSlot.partitionKey = sampleTimeSlot._id;
sampleTimeSlot.resourceID = sampleResource._id;
sampleTimeSlot.isBooked = false;
sampleTimeSlot.isEnabled = true;
sampleTimeSlot.slotFromDate = new Date('2021-03-22');
sampleTimeSlot.slotToDate = new Date('2021-03-25');
sampleTimeSlot.availableSeats = 5;

describe('Add Bookings', () => {
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
            await request.post(`${helpers.API_URL}/api/v1/add-bookings`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to add a booking but the request body seems to be empty. Kindly specify booking fields to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should create doc document when all validation passes', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/add-bookings`, {
            json: true,
            body: {
                resourceID: sampleResource._id,
                numberOfSeats: 2,
                fromDate: '2021-03-23',
                toDate: '2021-03-24',
                customerVehicle: 'Abc-123'
            },
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result.description).to.eql('Booking is reserved');
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
    });
});