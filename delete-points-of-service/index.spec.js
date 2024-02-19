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
const sampleBusinessUnits = { ...require('../spec/sample-docs/BusinessUnits'), _id: uuid.v4() };
const sampleBusinessUnits2 = { ...require('../spec/sample-docs/BusinessUnits'), _id: uuid.v4() };

let authToken = '';
let pointOfServiceID;

describe('Delete points of service', () => {
    before(async () => {
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });
        sampleBusinessUnits.merchantID = sampleMerchant._id;

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
        pointOfServiceID = uuid.v4();
        sampleBusinessUnits.pointOfService = new Array({
            'pointOfServiceID': pointOfServiceID,
            'pointOfServiceName': 'Kassa 1',
            'pointOfServiceDescription': 'The main POS',
            'pointOfServiceDeviceID': 'FTHY-F345-FF67',
            'location': 'Floor 1',
            'latitude': -78.75,
            'longitude': 20.412345,
            'isOnline': true,
            'lastContact': new Date('2017-10-16T14:05:36Z')
        });

        sampleBusinessUnits2.pointOfService = new Array({
            'pointOfServiceID': uuid.v4(),
            'pointOfServiceName': 'Kassa 1',
            'pointOfServiceDescription': 'The main POS',
            'pointOfServiceDeviceID': 'FTHY-F345-FF67',
            'location': 'Floor 1',
            'latitude': -78.75,
            'longitude': 20.412345,
            'isOnline': true,
            'lastContact': new Date('2017-10-16T14:05:36Z')
        });
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/business-units', {
            body: sampleBusinessUnits,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/business-units', {
            body: sampleBusinessUnits2,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

    });

    it('should throw error if the business-units Id is not exist', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/points-of-service?businessunitID=${uuid.v4()}&pointOfServiceID=${pointOfServiceID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The businessunit id specified in the URL doesn\'t exist.',
                reasonPhrase: 'BusinessUnitNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error and do not delete points of service if business-units merchant Id not linked to user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/points-of-service?businessunitID=${sampleBusinessUnits2._id}&pointOfServiceID=${pointOfServiceID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Businessunit not accessible to the user',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }

        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${sampleBusinessUnits2._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });


    it('should delete point of service from business-unit doc when all validation passes', async () => {
        const result = await request.delete(`${helpers.API_URL}/api/v1/points-of-service?businessunitID=${sampleBusinessUnits._id}&pointOfServiceID=${pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.deep.equal({
            code: 200,
            description: 'Successfully deleted the points of service'
        });

        const businessUnit = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${sampleBusinessUnits._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        expect(businessUnit).not.to.be.null;
        expect(businessUnit).to.be.instanceOf(Array);
        expect(businessUnit[0].pointOfService).to.be.instanceOf(Array).is.of.length(0);

        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${sampleBusinessUnits._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

    });

    after(async () => {
        await Promise.all([
            request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            }),
            request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            }),
        ]);
    });
});