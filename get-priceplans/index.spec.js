'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';

describe('Get Price Plan', () => {

    before(async () => {
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
    });


    it('should throw error if no query parameters provided', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/priceplans`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide query parameters to search price plans by, like _id or currency or country or languageCode',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should not return the pricePlan if incorrect query params are provided for search', async () => {
        try {
            await request
                .get(`${helpers.API_URL}/api/v1/priceplans?country=SEk`, {
                    json: true,
                    headers: {
                        'Authorization': authToken
                    }
                });
        } catch (error) {
            const response = {
                code: 404,
                description: 'No Priceplans found',
                reasonPhrase: 'PriceplanNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
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