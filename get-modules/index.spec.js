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

describe('Get Modules', () => {

    before(async () => {

        sampleUser.merchants[0].merchantID = merchantID;
        sampleModules.adminRights = [
            {
                merchantID: merchantID,
                merchantName: 'Turistbutiken i Åre',
                roles: 'admin'
            }];
        sampleModules.moduleName = {
            'sv-SE': {
                text: 'a'
            },
            'en-US': {
                text: 'zzz'
            }
        };

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

  
    it('should throw error on unauthenticate user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/modules`, {
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

    it('should return modules when all cases are pass', async () => {
        
        const result = await request.get(`${helpers.API_URL}/api/v1/modules`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.be.instanceOf(Array).and.not.have.lengthOf(0);

    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/merchants/${merchantID}/modules/${sampleModules._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
       
    });
});