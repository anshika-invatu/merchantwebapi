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
const sampleModuleTemplates = { ...require('../spec/sample-docs/ModuleTemplates'), _id: uuid.v4() };
sampleModuleTemplates.partitionKey = sampleModuleTemplates._id;
sampleModuleTemplates.issuedByMerchantID = merchantID;
let authToken = '';
sampleModuleTemplates.adminRights = [{
    merchantID: merchantID,
    merchantName: 'test',
    roles: 'admin' }];
sampleModuleTemplates.moduleTemplateName = {
    'sv-SE': {
        'text': 'Testing123'
    },
    'en-US': {
        'text': 'TestingABC'
    }
};

describe('Search Module Template', () => {

    before(async () => {

        sampleUser.merchants[0].merchantID = merchantID;

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

        await request.post(process.env.DEVICE_API_URL + '/api/v1/module-templates', {
            body: sampleModuleTemplates,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });


    it('should return doc when all cases pass with languageCode sv-SE', async () => {
       
        const pos = await request.get(`${helpers.API_URL}/api/v1/search-module-templates?name=Testing123`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(pos).not.to.be.null;
        expect(pos[0].docType).to.equal('moduleTemplates');
        expect(pos[0]._id).to.equal(sampleModuleTemplates._id);
    });

    it('should return doc when all cases pass with all query params', async () => {
       
        const pos = await request.get(`${helpers.API_URL}/api/v1/search-module-templates?name=Testing123&isPublic=false`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(pos).not.to.be.null;
        expect(pos[0].docType).to.equal('moduleTemplates');
        expect(pos[0]._id).to.equal(sampleModuleTemplates._id);
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/merchants/${merchantID}/module-templates/${sampleModuleTemplates._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

    });
});