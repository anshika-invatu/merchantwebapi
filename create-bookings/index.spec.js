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
const sampleBookings = { ...require('../spec/sample-docs/Bookings'), _id: uuid.v4(), merchantID: sampleMerchantID };
let authToken = '';

describe('Create Bookings', () => {
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
       
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/bookings`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a booking but the request body seems to be empty. Kindly specify booking fields to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should create doc document when all validation passes', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/bookings`, {
            json: true,
            body: sampleBookings,
            headers: {
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result._id).to.equal(sampleBookings._id);
        expect(result.docType).to.equal('bookings');

    });


    after(async () => {
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