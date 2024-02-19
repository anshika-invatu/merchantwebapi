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

describe('Remove the merchant from user', () => {
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
        sampleUser.merchants = new Array(...merchantArray);

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
            await request.delete(`${helpers.API_URL}/api/v1/merchant-link/${sampleMerchant2._id}`, {
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

            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 404 error if the merchantID is not in merchant section of user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchant-link/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The Merchant not linked to user',
                reasonPhrase: 'MerchantNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });


    it('should remove the merchant from merchant section of user when all validation passes', async () => {
        const response = await request
            .delete(`${helpers.API_URL}/api/v1/merchant-link/${sampleMerchant2._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(response).not.to.be.null;
        expect(response).to.deep.equal({
            code: 200,
            description: 'Successfully delete merchant-link from user'
        });

        //checking if merchant list updated
        const user = await request.get(process.env.USER_API_URL + `/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        expect(user).not.to.be.null;
        expect(user.merchants).to.be.instanceOf(Array).and.have.lengthOf(1);// sampleMerchant2 will be removed
        expect(user.merchants[0]._id).not.to.be.eql(sampleMerchant2._id);
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