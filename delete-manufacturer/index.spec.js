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
const merchantID = '9e32d3b1-41e5-40ff-bad3-c9ee9f7cdf20';
let authToken = '';

describe('Delete Manufacturers', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
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
        await request.post(`${helpers.API_URL}/api/v1/manufacturers`, {
            body: sampleManufacturers,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should delete doc when all validation pass', async () => {

        const response = await request.delete(`${helpers.API_URL}/api/v1/manufacturers/${sampleManufacturers._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(response).not.to.null;
        expect(response.description).to.equal('Successfully deleted the specified manufacturers');

    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        await request.patch(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            body: {
                merchants: []
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        try {
            await request.delete(`${helpers.API_URL}/api/v1/manufacturers/${uuid.v4()}`, {
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
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

    });
});