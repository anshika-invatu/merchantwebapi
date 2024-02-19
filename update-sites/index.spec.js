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
const sampleSites = { ...require('../spec/sample-docs/Sites'), _id: uuid.v4() };
sampleSites.partitionKey = sampleSites._id;
let authToken = '';

describe('Update Sites', () => {

    before(async () => {

        sampleSites.ownerMerchantID = merchantID;
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

    });

    it('should update site doc when all validation pass', async () => {
        await request.post(`${helpers.API_URL}/api/v1/sites`, {
            body: sampleSites,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        const result = await request.patch(`${helpers.API_URL}/api/v1/sites/${sampleSites._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: { siteName: 'test' }
        });
        expect(result).not.to.be.null;
        expect(result.description).to.be.equal('Successfully updated the specified site');

        await request.delete(`${helpers.API_URL}/api/v1/sites/${sampleSites._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should not delete site when db don\'t have site with this id.', async () => {

        try {
            await request.patch(`${helpers.API_URL}/api/v1/sites/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: { siteName: 'test' }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The sites specified details in the URL doesn\'t exist.',
                reasonPhrase: 'SitesNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should return error when id is not in uuid format', async () => {
       
        try {
            await request.patch(`${helpers.API_URL}/api/v1/sites/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                },
                body: { siteName: 'test' }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
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