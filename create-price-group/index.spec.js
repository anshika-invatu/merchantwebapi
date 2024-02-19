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
const samplePriceGroups = { ...require('../spec/sample-docs/PriceGroups'), _id: uuid.v4() };
samplePriceGroups.partitionKey = samplePriceGroups._id;
samplePriceGroups.merchantID = merchantID;
let authToken = '';

describe('Create POSGroups', () => {

    before(async () => {

        samplePriceGroups.merchantID = merchantID;
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

    it('should throw error if request body is empty', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/price-group`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            console.log(error.error);
            const response = {
                code: 400,
                description: 'You\'ve requested to create a new priceGroups but the request body seems to be empty. Kindly pass the priceGroups to be created using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should create doc when all validation pass', async () => {

        const result = await request.post(`${helpers.API_URL}/api/v1/price-group`, {
            body: samplePriceGroups,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.be.equal(samplePriceGroups._id);
    });

    it('should not create doc when module already exist', async () => {

        try {
            await request.post(`${helpers.API_URL}/api/v1/price-group`, {
                body: samplePriceGroups,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 409,
                description: 'You\'ve requested to create a new priceGroups but a priceGroups with the specified _id field already exists.',
                reasonPhrase: 'DuplicatePriceGroupsError'
            };
            expect(error.statusCode).to.equal(409);
            expect(error.error).to.eql(response);

            await request.delete(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${samplePriceGroups.adminRights[0].merchantID}/price-group/${samplePriceGroups._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
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