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
const samplePointOfService = { ...require('../spec/sample-docs/PointOfService'), _id: uuid.v4() };
const sampleComponents = { ...require('../spec/sample-docs/Components'), _id: uuid.v4() };
samplePointOfService.partitionKey = merchantID;
sampleComponents.pointOfServiceID = samplePointOfService._id;
sampleComponents.componentTypeID = uuid.v4();
let authToken = '';
samplePointOfService.components = [{
    componentID: sampleComponents._id
}];

describe('Filter POS Components', () => {

    before(async () => {

        samplePointOfService.merchantID = merchantID;
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

        await request.post(process.env.DEVICE_API_URL + '/api/v1/point-of-services', {
            body: samplePointOfService,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        await request.post(helpers.API_URL + '/api/v1/pos-components', {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: sampleComponents
        });
    });


    it('should return the document with pointOfServiceID', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/pos-components?pointOfServiceID=${sampleComponents.pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result[0]._id).to.equal(sampleComponents._id);
        expect(result[0].docType).to.equal('components');
    });

    it('should return the document with componentTypeID', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/pos-components?componentTypeID=${sampleComponents.componentTypeID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result[0]._id).to.equal(sampleComponents._id);
        expect(result[0].docType).to.equal('components');
    });

    it('should return the document with merchantID', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/pos-components?merchantID=${merchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result[0]._id).to.equal(sampleComponents._id);
        expect(result[0].docType).to.equal('components');
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.DEVICE_API_URL}/api/v1/merchants/${samplePointOfService.merchantID}/point-of-services?pointOfServiceID=${samplePointOfService._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

    });
});