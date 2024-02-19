'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomString2 = crypto.randomBytes(3).toString('hex');
const email2 = `test.${randomString2}@vourity.com`;
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const anotherUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email: email2 };
let authToken = '';
let anotherAuthToken = '';

describe('Get consents', () => {
    before(async () => {
        sampleUser.consents = new Array({
            'consentName': 'Terms and Conditions',
            'consentKey': 'TERMSCOND',
            'documentVersion': '1.0 / 2018-05-16',
            'documentURL': 'https://media.vourity.com/documents/tcv1.pdf',
            'approvalDate': new Date('2017-10-16T14:05:36Z')
        });
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

        anotherUser.consents = '';
        anotherUser.mobilePhone = '+463213123456';
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: anotherUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const anotherToken = await request.post(process.env.USER_API_URL + '/api/v1/login', {
            body: {
                email: anotherUser.email,
                password: anotherUser.password
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        anotherAuthToken = anotherToken.token;
    });

    it('should throw error on unauthenticate request', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/consents`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if consent is not exist', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/consents`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': anotherAuthToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The consents not found',
                reasonPhrase: 'ConsentNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should get consents when all validation pass', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/consents`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.consents).to.be.instanceOf(Array).and.have.lengthOf(1);
        expect(result.consents[0].consentName).to.equal('Terms and Conditions');//consents field

    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${anotherUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});