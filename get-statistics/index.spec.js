'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';

describe('Get merchant statistics', () => {
    
    before(async () => {

        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });
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

    it('should throw error if the merchant statistics value not provided in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/statistics`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide merchant valid statistics value like daily or monthly',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics value provided is invalid in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/statistics?statistics=xyz`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide merchant valid statistics value like daily or monthly',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics value is daily but month not provided in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/statistics?statistics=daily`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid month number to get daily statistics in query string',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics value is daily but month is provided is invalid in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/statistics?statistics=daily&month=14`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid month number to get daily statistics in query string',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics value is daily and month is provided is valid but year provided is invalid in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/statistics?statistics=daily&month=12&year=20A2`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid year to get daily statistics',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics daily doc of specified merchantID not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/statistics?statistics=daily&month=10&year=2010`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The merchantstatisticsdaily of specified details doesn\'t exist.',
                reasonPhrase: 'MerchantDailyStatisticsNotFoundError'
            };


            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics daily doc of specified merchantID not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/statistics?statistics=daily&month=12`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The merchantstatisticsdaily of specified details doesn\'t exist.',
                reasonPhrase: 'MerchantDailyStatisticsNotFoundError'
            };


            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics value is monthly and year is not provided in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/statistics?statistics=monthly`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid year to get monthly statistics',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics value is monthly and year is provided not valid in query string', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/statistics?statistics=monthly&year=20A1`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide valid year to get monthly statistics',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchant statistics monthly doc of specified merchantID not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleMerchant._id}/statistics?statistics=monthly&year=2017`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The merchantstatisticsmonthly of specified details doesn\'t exist.',
                reasonPhrase: 'MerchantMonthlyStatisticsNotFoundError'
            };


            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if the merchantID not linked to user exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/statistics?statistics=monthly&year=2017`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
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