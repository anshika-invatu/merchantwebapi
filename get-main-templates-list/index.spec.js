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
const sampleModuleMainTemplates = { ...require('../spec/sample-docs/ModuleMainTemplates'), _id: uuid.v4() };
sampleModuleMainTemplates.partitionKey = sampleModuleMainTemplates._id;
let authToken = '';

describe('Get Main Module Templates list', () => {

    before(async () => {

        sampleModuleMainTemplates.merchantID = merchantID;
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

    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/main-templates-list`, {
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



    it('should not create module doc when main module doc not exist', async () => {

        
        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleModuleMainTemplates.merchantID}/main-templates-list`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    
        expect(result).not.to.be.null;
        
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