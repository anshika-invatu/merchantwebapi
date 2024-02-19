'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'),
    _id: uuid.v4(),
    email
};
const qrRequest = require('../spec/sample-docs/GenerateQR');
let authToken = '';

describe('Generate QR', () => {
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

    it('should throw error if request not authenticated', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/generate-qr`, {
                json: true,
                body: {},
                headers: {}
            });
        } catch (error) {
            expect(error.statusCode).to.equal(401);
        }
    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/generate-qr`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
            expect(error.statusCode).to.equal(400);
        }
    });

    it('should throw error if body is in wrong format', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/generate-qr`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: 'wrong format'
            });
        } catch (error) {
            expect(error.statusCode).to.equal(400);
        }
    });

    it('should get QR if all velidation pass', async () => {
        await request.post(`${helpers.API_URL}/api/v1/generate-qr`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: qrRequest
        });
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