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
const sampleModules = { ...require('../spec/sample-docs/Modules'), _id: uuid.v4() };
sampleModules.partitionKey = sampleModules._id;
let authToken = '';

describe('Delete Modules', () => {

    before(async () => {

        sampleUser.merchants[0].merchantID = merchantID;
        sampleModules.adminRights = [
            {
                merchantID: merchantID,
                merchantName: 'Turistbutiken i Åre',
                roles: 'admin'
            }];

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

        await request.post(`${process.env.DEVICE_API_URL}/api/v1/modules`, {
            body: sampleModules,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

    });

    it('should return error code 401 when merchant not linked to the user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/modules/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Merchants not linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error on unauthenticate user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/modules/${uuid.v4()}`, {
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

    it('should delete module when all cases are pass', async () => {
        
        const result = await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/modules/${sampleModules._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result.description).to.equal('Successfully deleted module');
    });

    it('should throw error when user not have admin permission to delete merchant', async () => {
        sampleModules.adminRights = [];
        await request.post(`${process.env.DEVICE_API_URL}/api/v1/modules`, {
            body: sampleModules,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/modules/${sampleModules._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'This merchant does not have permission to delete the module',
                reasonPhrase: 'MerchantNotAuthorizedError'
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