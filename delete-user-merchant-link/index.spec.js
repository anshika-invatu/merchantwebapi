'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomString2 = crypto.randomBytes(3).toString('hex');
const email2 = `test.${randomString2}@vourity.com`;
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const anotherUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email: email2 };
const sampleMerchant1 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleMerchant2 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };
const sampleMerchant3 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };

let authToken = '';

describe('Remove the merchant from another user', () => {
    before(async () => {
        const merchantArray = [];
        merchantArray.push({
            merchantID: sampleMerchant1._id,
            merchantName: sampleMerchant1.merchantName,
            roles: 'view,write,report',
        });
        merchantArray.push({
            merchantID: sampleMerchant2._id,
            merchantName: sampleMerchant2.merchantName,
            roles: 'admin,view,write,report', // this merchant roles has admin permission
        });
        merchantArray.push({
            merchantID: sampleMerchant3._id,
            merchantName: sampleMerchant3.merchantName,
            roles: 'admin,view,write,report', // this merchant roles has admin permission
        });
        sampleUser.merchants = new Array(...merchantArray);
        sampleUser.mobilePhone += randomString2;
        anotherUser.mobilePhone = '+4632131233123456' + randomString;
        anotherUser.merchants = new Array(merchantArray[0],merchantArray[1]);
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: anotherUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

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
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
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

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to delete merchant-link from user but the request body seems to be empty. Kindly specify the merchantID and userID field using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return status code 400 and field validation error when userID or merchantID is missing from request body', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                body: {
                    userID: anotherUser._id
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Please provide userID and merchantID field in request body',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return status code 400 when request body is null', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to delete merchant-link from user but the request body seems to be empty. Kindly specify the merchantID and userID field using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 404 error if the merchantID is not in merchant section of user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                body: {
                    userID: anotherUser._id,
                    merchantID: uuid.v4()
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
                description: 'The Merchant not linked to user',
                reasonPhrase: 'MerchantNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw 403 error if the user do not have admin permission for the merchant to delete from another user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                body: {
                    userID: anotherUser._id,
                    merchantID: sampleMerchant1._id
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 403,
                description: 'User do not have admin permission for this merchant',
                reasonPhrase: 'UserNotAuthenticatedError'
            };

            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }
    });
    
    it('should throw 404 error if the user has admin permission for merchant but that merchant not linked to another user', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                body: {
                    userID: anotherUser._id,
                    merchantID: sampleMerchant3._id
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
                description: 'The Merchant not linked to user',
                reasonPhrase: 'MerchantNotFoundError'
            };

            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    it('should remove the merchant from merchant section of another user when all validation passes', async () => {
        const response = await request
            .delete(`${helpers.API_URL}/api/v1/user-merchant-link`, {
                body: {
                    userID: anotherUser._id,
                    merchantID: sampleMerchant2._id
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });

        expect(response).not.to.be.null;
        expect(response).to.deep.equal({
            code: 200,
            description: 'Successfully delete merchant-link from another user'
        });

        //checking if merchant list updated
        const user = await request.get(process.env.USER_API_URL + `/api/v1/users/${anotherUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        expect(user).not.to.be.null;
        expect(user.merchants).to.be.instanceOf(Array).and.not.have.lengthOf(0);// sampleMerchant2 will be removed
        expect(user.merchants[0]._id).not.to.be.eql(sampleMerchant2._id);
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${anotherUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});