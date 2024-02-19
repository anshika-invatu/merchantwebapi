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

describe('Update sendNotification', () => {
    beforeEach(async () => {
        sampleUser.sendNotifications = {
            viaEmail: true,
            viaSMS: false,
            viaPush: false,
            onMerchantMemberRequest: true,
            onMerchantMemberRemoval: true,
            onProfileChanges: true,
            onVourityNews: false,
            onPayout: true,
            onFailedTransaction: true,
            onFailedPayout: true,
            onSupportRequest: true
        };
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

    it('should throw unauhtenticated error on incorrect _id field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/send-notification/123`, {
                json: true,
                body: {},
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
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

    it('should throw error if sendNotification with its field does not exist in request body', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/send-notification/${sampleUser._id}`, {
                json: true,
                body: { _id: 123 },
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide sendNotifications with its fields in request body',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return success when sendNotification changed successfully', async () => {
        const sendNotifications = {
            viaEmail: false,
            viaSMS: true,
            viaPush: true,
            onMerchantMemberRequest: true,
            onMerchantMemberRemoval: true,
            onProfileChanges: true,
            onVourityNews: false,
            onPayout: true,
            onFailedTransaction: true,
            onFailedPayout: true,
            onSupportRequest: true
        };
        const result = await request.patch(`${helpers.API_URL}/api/v1/send-notification/${sampleUser._id}`, {
            json: true,
            body: {
                sendNotifications
            },
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).to.eql({ code: 200, description: 'Successfully updated the sendNotification' });
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
      
        expect(user.sendNotifications).to.eql(sendNotifications);
    });

    afterEach(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});