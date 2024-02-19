'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const merchantID = uuid.v4();
const id = uuid.v4();
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const samplePartnerNetwork = { ...require('../spec/sample-docs/PartnerNetwork'), _id: uuid.v4() };
let authToken = '';
sampleUser.merchants[0].merchantID = merchantID;
sampleUser.merchants[0].roles = 'admin';
samplePartnerNetwork.ownerMerchantID = merchantID;
sampleUser.merchants[0].roles = 'admin';
samplePartnerNetwork.partnerNetworkMembers = [{
    merchantID: merchantID,
    merchantName: 'Turistbutiken i Åre',
    commissionAmount: 18.50,
    commissionPercent: 5.00,
    currency: 'SEK',
    roles: 'admin'
}];
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: merchantID };

describe('Send Partner Network Member Request', () => {

    before(async () => {
        sampleUser.merchants[0].merchantID = merchantID;
        samplePartnerNetwork.partnerNetworkMembers[0].merchantID = merchantID;
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

        await request.post(process.env.VOUCHER_API_URL + `/api/${process.env.USER_API_VERSION}/partner-networks`, {
            body: samplePartnerNetwork,
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.post(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/merchants', {
            body: sampleMerchant,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.patch(helpers.API_URL + '/api/v1/send-partner-network-member-request', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to send a partnerNetworkMemberRequest but the request body seems to be empty. Kindly pass the request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
            
        }
    });

    it('should return status code 400 when request body fields are missing', async () => {
        try {
            await request.patch(helpers.API_URL + '/api/v1/send-partner-network-member-request', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {}
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide req body parameters partnerNetworkID, merchantID and inviteCode',
                reasonPhrase: 'FieldValidationError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
            
        }
    });

    it('should throw error on incorrect _id field', async () => {
        try {
            await request.patch(helpers.API_URL + '/api/v1/send-partner-network-member-request', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                },
                body: {
                    partnerNetworkID: '123',
                    merchantID: id,
                    inviteCode: uuid.v4()
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'MerchantID not linked to this user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };
            
            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should invite partner merchant when all validation passes', async () => {
       
        const result = await request.patch(helpers.API_URL + '/api/v1/send-partner-network-member-request', {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            },
            body: {
                partnerNetworkID: samplePartnerNetwork._id,
                merchantID: merchantID,
                inviteCode: samplePartnerNetwork.inviteCode
            }
        });
        expect(result).not.to.be.null;
        expect(result).to.eql({
            code: 200,
            description: 'Successfully send partner network request'
        });
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/merchants/${merchantID}/partner-networks/${samplePartnerNetwork._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${merchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
    });
});