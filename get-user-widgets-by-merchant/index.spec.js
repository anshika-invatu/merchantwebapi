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
const userID = uuid.v4();
const merchantID = uuid.v4();
const sampleUserWidgets = { ...require('../spec/sample-docs/UserWidgets'), _id: uuid.v4() };
sampleUserWidgets.partitionKey = userID;
sampleUserWidgets.userID = userID;
sampleUserWidgets.merchantIDs = [merchantID];
sampleUserWidgets.merchants = {
    [merchantID]: {
        pageCodes: {
            posDashboard: {
                layout: {
                }
            },
            posOpenHours: {
                layout: {
                }
            }
        }
    }
};

describe('Get user-widgets-by-merchant', () => {
    before(async () => {
        sampleUser._id = userID;
        sampleUser.partitionKey = userID;
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

        await request.post(process.env.USER_API_URL + '/api/v1/user-widgets', {
            body: sampleUserWidgets,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });

    it('should throw unauhtenticated error on incorrect userId field', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/user-widgets/${userID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'User is not able to get user widgets for this MerchantID and userID',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw unauhtenticated error on incorrect merchantId field', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/user-widgets/${userID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'User is not able to get user widgets for this MerchantID and userID',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    
    it('should return doc', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/user-widgets/${userID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
       
        expect(result[0]._id).to.eql(sampleUserWidgets._id);
        expect(result[0].merchants[merchantID].pageCodes.posOpenHours).not.to.be.null;
    });

    it('should return doc with query params', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${merchantID}/user-widgets/${userID}?pageCode=posDashboard`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result[0]._id).to.eql(sampleUserWidgets._id);
        expect(result[0].merchants[merchantID].pageCodes.posOpenHours).to.be.undefined;
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/merchants/${merchantID}/user-widgets/${userID}?pageCode=posDashboard`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});