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
const sampleEnergyManagementGroups = { ...require('../spec/sample-docs/energyManagementGroups'), _id: uuid.v4() };
sampleEnergyManagementGroups.partitionKey = sampleEnergyManagementGroups._id;
let authToken = '';

describe('get-energy-group', () => {

    before(async () => {

        sampleEnergyManagementGroups.merchantID = merchantID;
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

        await request.post(`${helpers.API_URL}/api/v1/merchants/${sampleEnergyManagementGroups.adminRights[0].merchantID}/energy-management-groups`, {
            body: sampleEnergyManagementGroups,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });

    });

    it('should throw error if request body is empty', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleEnergyManagementGroups.adminRights[0].merchantID}/energy-management-groups/${123}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
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


    it('should return doc when all validation pass', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleEnergyManagementGroups.adminRights[0].merchantID}/energy-management-groups/${sampleEnergyManagementGroups._id}`, {
            body: sampleEnergyManagementGroups,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        expect(result).not.to.be.null;
        expect(result._id).to.equal(sampleEnergyManagementGroups._id);
    });

    it('should not get doc when data not exist', async () => {

        try {
            await request.get(`${helpers.API_URL}/api/v1/merchants/${sampleEnergyManagementGroups.adminRights[0].merchantID}/energy-management-groups/${uuid.v4()}`, {
                body: sampleEnergyManagementGroups,
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
           
            const response = {
                code: 404,
                description: 'The energyManagementGroups specified details in the URL doesn\'t exist.',
                reasonPhrase: 'EnergyManagementGroupsNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    after(async () => {
        await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleEnergyManagementGroups.adminRights[0].merchantID}/energy-management-groups/${sampleEnergyManagementGroups._id}`, {
            body: sampleEnergyManagementGroups,
            json: true,
            headers: {
                'Authorization': authToken
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
       
    });
});