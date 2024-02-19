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
let authToken = '';

describe('Generate-mpc-qr-code', () => {
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
            await request.get(`${helpers.API_URL}/api/v1/generate-mpc-qr-code/123`, {
                json: true,
                headers: {}
            });
        } catch (error) {
            expect(error.statusCode).to.equal(401);
        }
    });


    it('should throw error if mobilePaymentCode not present in db', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/generate-mpc-qr-code/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The mobilePaymentCode id specified in the URL doesn\'t exist.',
                reasonPhrase: 'MobilePaymentCodeNotFoundError'
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