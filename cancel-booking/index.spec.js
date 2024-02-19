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
let authToken = '';
sampleBookings.partitionKey = sampleBookings._id;
delete sampleBookings.retailTransactionID;

describe('Cancel Bookings', () => {
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
       
    });
    it('should return status code 404 when booking not exist', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/cancel-bookings/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
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


    it('should cancel booking when all validation passes', async () => {
        const result = await request.delete(`${helpers.API_URL}/api/v1/cancel-bookings/${sampleBookings._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully cancel booking.'
        });

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