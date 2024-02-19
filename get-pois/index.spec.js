'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const merchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePointOfInterest = { ...require('../spec/sample-docs/PointOfInterest'), _id: uuid.v4() };

samplePointOfInterest.poiName = 'test 1234';
samplePointOfInterest.location.streetRow1 = 'test 1234';
samplePointOfInterest.categories[1] = 'test';
samplePointOfInterest.tags[1] = 'test123';
samplePointOfInterest.rating = 3.6;

let authToken = '';

describe('Search PointOfInterest', () => {
    before(async () => {
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
        samplePointOfInterest.merchantID = merchantID;
        await request.post(`${helpers.API_URL}/api/v1/point-of-interest`, {
            body: samplePointOfInterest,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
    });

    it('should throw 401 error if the merchantID is not linked to user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/get-pois`, {
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

    it('should get doc list by merchantID', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/get-pois`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                merchantID
            }
        });
        expect(response).not.to.null;
        expect(response[0]._id).to.equal(samplePointOfInterest._id);
    });

    it('should get doc list by location.streetRow1', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/get-pois`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                location: {
                    streetRow1: 'test'
                }
            }
        });
        expect(response).not.to.null;
        expect(response[0].location.streetRow1).to.includes('test');
    });

    it('should get doc list by categories', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/get-pois`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                categories: ['test']
            }
        });
        expect(response).not.to.null;
        expect(response[0].categories).to.includes('test');
    });

    it('should get doc list by tags', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/get-pois`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                tags: ['test123']
            }
        });
        expect(response).not.to.null;
        expect(response[0].tags).to.includes('test123');
    });

    it('should get doc list by rating', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/get-pois`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                rating: 3
            }
        });
        expect(response).not.to.null;
        expect(response[0].rating).to.greaterThan(3);
    });

    it('should get doc list by position', async () => {
        // get lat and lon in 50m radius
        const lat = samplePointOfInterest.location.latitude + (180 / Math.PI) * (10 / 6378137);
        const lon = samplePointOfInterest.location.longitude + (180 / Math.PI) * (10 / 6378137) / Math.cos(samplePointOfInterest.location.latitude);
        
        const response = await request.post(`${helpers.API_URL}/api/v1/merchants/${merchantID}/get-pois`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: {
                location: {
                    latitude: lat,
                    longitude: lon
                },
                radius: 50,
                merchantID
            }
        });
        expect(response).not.to.null;
        expect(response[0].merchantID).to.equal(merchantID);
    });

    after(async () => {
        
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${merchantID}/point-of-interest/${samplePointOfInterest._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});