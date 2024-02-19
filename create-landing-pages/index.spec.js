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
const sampleLandingPages = { ...require('../spec/sample-docs/LandingPages'), _id: uuid.v4() };
sampleLandingPages.partitionKey = sampleLandingPages._id;
let authToken = '';

describe('Create LandingPages', () => {

    before(async () => {

        sampleLandingPages.merchantID = merchantID;
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
            await request.post(`${helpers.API_URL}/api/v1/landing-pages`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new landing page but the request body seems to be empty. Kindly pass the req body.',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should create doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/landing-pages`, {
            body: sampleLandingPages,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.be.equal(sampleLandingPages._id);
    });

    it('should not create doc when module already exist', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/landing-pages`, {
                body: sampleLandingPages,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/landing-pages/${sampleLandingPages._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                },
                body: { userMerchants: [merchantID]}
            });
    
            const response = {
                code: 409,
                description: 'You\'ve requested to create a new landingPages but a landingPages with the specified _id field already exists.',
                reasonPhrase: 'DuplicateLandingPages'
            };
            expect(error.statusCode).to.equal(409);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when req body don\'t have merchantID', async () => {
        sampleLandingPages._id = uuid.v4();
        sampleLandingPages.partitionKey = sampleLandingPages._id;
        delete sampleLandingPages.merchantID;
        try {
            await request.post(`${helpers.API_URL}/api/v1/landing-pages`, {
                body: sampleLandingPages,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Please send MerchantID in req body.',
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
       
    });
});