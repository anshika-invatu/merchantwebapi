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

let authToken = '', salesPersonID;

describe('Update sales persons', () => {
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
        salesPersonID = uuid.v4();
        sampleBusinessUnits.salesPersons = new Array({
            'salesPersonID': salesPersonID,
            'salesPersonName': 'Sales 1',
            'salesPersonCode': 'T1234',
            'salesPersonIconUrl': 'http://media.vourity.com/sale1.jpg'
        });

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

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/sales-persons?businessunitID=${sampleBusinessUnits2._id}&salesPersonID=${salesPersonID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to update a sales persons but the request body seems to be empty. Kindly specify the sales persons field to be updated using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if sales persons field not exist in request body', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/sales-persons?businessunitID=${sampleBusinessUnits._id}&salesPersonID=${salesPersonID}`, {
                json: true,
                body: { phone: '+46701234567890123' }, // not having point of service field
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide salesPersons field in request body',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });


    it('should throw error if the business-units Id is not exist', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/sales-persons?businessunitID=${uuid.v4()}&salesPersonID=${salesPersonID}`, {
                body: {
                    salesPersons: {
                        'salesPersonID': uuid.v4(),
                        'salesPersonName': 'Sales 1',
                        'salesPersonCode': 'T1234',
                        'salesPersonIconUrl': 'http://media.vourity.com/sale1.jpg'
                    }
                },
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

    it('should throw error and do not update sales persons if business-units merchant Id not linked to user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/sales-persons?businessunitID=${sampleBusinessUnits2._id}&salesPersonID=${salesPersonID}`, {
                json: true,
                body: {
                    salesPersons: {
                        'salesPersonID': uuid.v4(),
                        'salesPersonName': 'Sales 1',
                        'salesPersonCode': 'T1234',
                        'salesPersonIconUrl': 'http://media.vourity.com/sale1.jpg'
                    }
                },
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


    it('should update sales persons in business-unit doc when all validation passes', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/sales-persons?businessunitID=${sampleBusinessUnits._id}&salesPersonID=${salesPersonID}`, {
            body: {
                salesPersons: {
                    'salesPersonName': 'Sales updated',
                    'salesPersonCode': 'T1234',
                    'salesPersonIconUrl': 'http://media.vourity.com/sale1.jpg'
                }
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result).to.deep.equal({
            code: 200,
            description: 'Successfully updated the sales person'
        });


        const businessUnit = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${sampleBusinessUnits._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        expect(businessUnit).not.to.be.null;
        expect(businessUnit).to.be.instanceOf(Array);
        expect(businessUnit[0].salesPersons).to.be.instanceOf(Array).and.have.lengthOf(1);
        expect(businessUnit[0].salesPersons[0].salesPersonName).to.equal('Sales updated');//updated sales persons field

        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${sampleBusinessUnits._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${sampleMerchant._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});