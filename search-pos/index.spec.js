'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
samplePointOfService.merchantID = sampleMerchant._id;
samplePointOfService.pointOfServiceName = 'testData123';
samplePointOfService.pointOfServiceDescription = 'test';
let authToken = '';

describe('Search points of service', () => {
    before(async () => {
        
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });

        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY,
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
       
        await request.post(process.env.DEVICE_API_URL + '/api/' + process.env.DEVICE_API_VERSION + '/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });
    it('should return pos when all cases pass', async () => {
       
        const pos = await request.post(`${helpers.API_URL}/api/v1/search-pos`, {
            json: true,
            body: { userMerchants: [sampleMerchant._id]},
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(pos).not.to.be.null;
        expect(pos[0].docType).to.equal('pointOfService');
        //expect(pos[0].merchantID).to.equal(sampleMerchant._id);
    });


    it('should return pos when all cases pass with name', async () => {
       
        const pos = await request.post(`${helpers.API_URL}/api/v1/search-pos`, {
            body: { pointOfServiceName: 'testData123' },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(pos).not.to.be.null;
        expect(pos[0].docType).to.equal('pointOfService');
        expect(pos[0].pointOfServiceName).to.equal('testData123');
    });

    it('should return pos when all cases pass with description', async () => {
       
        const pos = await request.post(`${helpers.API_URL}/api/v1/search-pos`, {
            body: { pointOfServiceName: 'testData123',
                pointOfServiceDescription: 'test' },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });
        expect(pos).not.to.be.null;
        expect(pos[0].docType).to.equal('pointOfService');
        expect(pos[0].pointOfServiceName).to.equal('testData123');
        expect(pos[0].pointOfServiceDescription).to.equal('test');
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${sampleMerchant._id}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
    });
});