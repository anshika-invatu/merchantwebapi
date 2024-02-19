'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');

const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleManufacturers = { ...require('../spec/sample-docs/Manufacturers'), _id: uuid.v4() };
sampleManufacturers.partitionKey = sampleManufacturers._id;
const merchantID = '9e32d3b1-41e5-40ff-bad3-c9ee9f7cdf20';
let authToken = '';

describe('Create Manufacturers', () => {

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

    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/manufacturers`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new manufacturers but the request body seems to be empty. Kindly pass the manufacturers to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should create doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/manufacturers`, {
            body: sampleManufacturers,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.be.equal(sampleManufacturers._id);
    });
    
    it('should not create doc when module already exist', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/manufacturers`, {
                body: sampleManufacturers,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/manufacturers/${sampleManufacturers._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.DEVICE_API_KEY
                }
            });
    
            const response = {
                code: 409,
                description: 'You\'ve requested to create a new manufacturers but a manufacturers with the specified _id field already exists.',
                reasonPhrase: 'DuplicateManufacturersError'
            };
            expect(error.statusCode).to.equal(409);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when user not be linked to merchantID', async () => {
        await request.patch(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            body: {
                merchants: []
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        sampleManufacturers._id = uuid.v4();
        sampleManufacturers.partitionKey = sampleManufacturers._id;
        try {
            await request.post(`${helpers.API_URL}/api/v1/manufacturers`, {
                body: sampleManufacturers,
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
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
       
    });
});