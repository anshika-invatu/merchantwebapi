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
const sampleReportSubscribers = { ...require('../spec/sample-docs/ReportSubscribers'), _id: uuid.v4() };
sampleReportSubscribers.partitionKey = sampleReportSubscribers._id;
let authToken = '';

describe('update-report-subscriber', () => {

    before(async () => {

        sampleReportSubscribers.merchantID = merchantID;
        sampleUser.merchants[0].merchantID = merchantID;
        sampleUser.merchants[0].roles = 'admin';
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

        await request.post(`${process.env.CONTENTS_API_URL}/api/${process.env.CONTENTS_API_VERSION}/report-subscriber`, {
            json: true,
            headers: {
                'x-functions-key': process.env.CONTENTS_API_KEY
            },
            body: sampleReportSubscribers
        });

    });

    it('should return error when merchant id not matched.', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/report-subscriber/${sampleReportSubscribers._id}`, {
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

    it('should return error when id not correct.', async () => {
        
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleReportSubscribers.merchantID}/report-subscriber/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The reportSubscribers id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should update doc when all validation pass', async () => {

        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleReportSubscribers.merchantID}/report-subscriber/${sampleReportSubscribers._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                reportCode: 'testCode'
            }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.equal('Successfully updated the specified report-subscriber');
    });

    
    after(async () => {
        await request.delete(`${process.env.CONTENTS_API_URL}/api/${process.env.CONTENTS_API_VERSION}/report-subscriber/${sampleReportSubscribers._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.CONTENTS_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        
    });
});