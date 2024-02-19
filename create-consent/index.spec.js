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

describe('Create consents', () => {
    before(async () => {
        sampleUser.consents = '';
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

    it('should throw error on unauthenticate request', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/consents`, {
                json: true,
                body: {},
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

    it('should throw error on empty request body', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/consents`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to create a consents but the request body seems to be empty. Kindly specify consents field to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw field validation error if consents field missing from request body', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/consents`, {
                json: true,
                body: {
                    _id: '123'
                },
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide consents field with consent key in request body',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should create consents when all validation pass', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/consents`, {
            json: true,
            body: {
                consents: {
                    'consentName': 'Terms and Conditions',
                    'consentKey': 'TERMSCOND',
                    'documentVersion': '1.0 / 2018-05-16',
                    'documentURL': 'https://media.vourity.com/documents/tcv1.pdf',
                    'approvalDate': new Date('2017-10-16T14:05:36Z')
                }
            },
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result.consents.consentName).to.equal('Terms and Conditions');

        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        expect(user).not.to.be.null;
        expect(user.consents).to.be.instanceOf(Array).and.have.lengthOf(1);
        expect(user.consents[0].consentName).to.equal('Terms and Conditions');//consents field
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