'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleMerchant1 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleMerchant2 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
let authToken = '';


describe('User accept merchant invites', () => {
    
    before(async () => {
        const merchantArray = [];
        merchantArray.push({
            merchantID: sampleMerchant1._id,
            merchantName: sampleMerchant1.merchantName
        });
        merchantArray.push({
            merchantID: sampleMerchant2._id,
            merchantName: sampleMerchant2.merchantName
        });
        sampleUser.merchantInvites = new Array(...merchantArray);
        sampleUser.merchants = new Array();// currently merchants section is empty

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
    });

    it('should throw error on unauthenticate request', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/accept-invite/${sampleMerchant2._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'Unable to authenticate user.',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            console.log(response);
        }
    });

    it('should throw 404 error if the merchantID is not exist in merchantInvites field of user', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/accept-invite/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The Merchant not exist in merchantInvites',
                reasonPhrase: 'MerchantNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should moved the merchant from merchantInvites to merchants section of user when all validation passes', async () => {
        const response = await request
            .patch(`${helpers.API_URL}/api/v1/accept-invite/${sampleMerchant2._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(response).not.to.be.null;
        expect(response).to.deep.equal({
            code: 200,
            description: 'Successfully moved merchant from merchantInvites to merchants section of user'
        });

        //checking if merchants list updated
        const user = await request.get(process.env.USER_API_URL + `/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        expect(user).not.to.be.null;
        //merchants section
        expect(user.merchants).to.be.instanceOf(Array).and.have.lengthOf(1);// sampleMerchant2 will be moved to merchants section
        expect(user.merchants[0].merchantID).to.be.equal(sampleMerchant2._id);
        // merchantInvites section
        expect(user.merchantInvites).to.be.instanceOf(Array).and.have.lengthOf(1);
        expect(user.merchantInvites[0].merchantID).not.to.be.equal(sampleMerchant2._id);// not to have sampleMerchant2
    });

    after(async () => {

        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});