'use strict';

const expect = require('chai').expect;
const moment = require('moment');
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomString2 = crypto.randomBytes(3).toString('hex');
const randomString3 = crypto.randomBytes(3).toString('hex');
const sampleEmail = `test.${randomString2}@vourity.com`;
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleAnotherUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email: `test.${randomString3}@vourity.com`, mobilePhone: '+123123' };
const sampleMerchant = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() }; // merchant linked to login user with admin permission and exist in merchantInvites of another user
const sampleMerchant2 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };// merchant linked to login user with admin permission but not exist in merchantInvites of another user
const sampleMerchant4 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };// merchant without admin permission linked to login user
const sampleMerchant5 = { ...require('../spec/sample-docs/Merchants'), _id: uuid.v4() };// merchant with admin permission linked to login user but already exist to another user merchants section


let authToken = '';

describe('Invite to merchant', () => {
    before(async () => {

        sampleUser.merchants = [];
        sampleUser.merchants.push({
            merchantID: sampleMerchant._id, // availiable in merchantInvites section of another user
            merchantName: sampleMerchant.merchantName,
            roles: 'admin,write'
        });
        sampleUser.merchants.push({
            merchantID: sampleMerchant5._id, // availiable in merchant section of another user
            merchantName: sampleMerchant5.merchantName,
            roles: 'admin,write'
        });
        sampleUser.merchants.push({
            merchantID: sampleMerchant2._id, // not availiable in merchantInvites section of another user
            merchantName: sampleMerchant2.merchantName,
            roles: 'admin,write'
        });
        sampleUser.merchants.push({
            merchantID: sampleMerchant4._id,
            merchantName: sampleMerchant4.merchantName,
            roles: 'write'
        });
        sampleAnotherUser.merchantInvites = [];
        sampleAnotherUser.merchantInvites = new Array({
            merchantID: sampleMerchant._id,
            merchantName: sampleMerchant.merchantName
        });

        sampleAnotherUser.merchants = [];
        sampleAnotherUser.merchants.push({
            merchantID: sampleMerchant5._id,
            merchantName: sampleMerchant5.merchantName,
            roles: 'write'
        });

        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleAnotherUser,
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


    it('should return status code 400 when request body is null', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to add merchant in merchantInvites but the request body seems to be empty. Kindly specify the merchantID and email field using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should return status code 400 and field validation error when email or merchantID is missing from request body', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
                body: {
                    email: sampleAnotherUser.email
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
                description: 'Please provide email and merchantID field in request body',
                reasonPhrase: 'FieldValidationError'
            };


            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error if merchant id is not accessible of login user', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
                body: {
                    merchantID: sampleMerchant4._id,
                    email: sampleAnotherUser.email
                },
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 401,
                description: 'login user dont have permission to update another user for this merchantID',
                reasonPhrase: 'UserNotAuthenticatedError'
            };


            expect(error.statusCode).to.equal(401);
            expect(error.error).to.eql(response);
        }
    });

    it('should create new user doc if user of this email not exist', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
            body: {
                merchantID: sampleMerchant._id,
                email: sampleEmail
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(response).not.to.be.null;
        expect(response).to.deep.eql({
            code: 200,
            description: 'Successfully created the invitemerchant'
        });
        const users = await request.get(`${process.env.USER_API_URL}/api/v1/users/${sampleEmail}/user`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        expect(users).not.to.be.null;
        expect(users).to.be.instanceOf(Array).and.have.lengthOf(1);
        expect(users[0].email).to.be.equal(sampleEmail);

        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${users[0]._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });

    it('should throw 403 error if the merchant already linked to anotheruser in merchant section', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
                body: {
                    merchantID: sampleMerchant5._id,
                    email: sampleAnotherUser.email
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
                description: 'The merchant already linked with the user',
                reasonPhrase: 'MerchantLinkedError'
            };


            expect(error.statusCode).to.equal(403);
            expect(error.error).to.eql(response);
        }
    });

    it('should update expiry date if the merchant already exist in invite merchant section', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
            body: {
                merchantID: sampleMerchant._id,
                email: sampleAnotherUser.email
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(response).not.to.be.null;
        expect(response).to.deep.eql({
            code: 200,
            description: 'Successfully created the invitemerchant'
        });

        const user = await request.get(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleAnotherUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const expiryDate = moment.utc().add(5, 'd')
            .format();

        expect(user).not.to.be.null;
        expect(user.merchantInvites).to.be.instanceOf(Array).and.have.lengthOf(1);
        expect((new Date(user.merchantInvites[0].inviteExpiryDate)).getDate()).to.eql((new Date(expiryDate).getDate()));// check updated expiry date

    });



    it('should add new merchant in invite merchant section if merchant do not exist', async () => {

        const response = await request.post(`${helpers.API_URL}/api/v1/invitetomerchant`, {
            body: {
                merchantID: sampleMerchant2._id,
                email: sampleAnotherUser.email
            },
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(response).not.to.be.null;
        expect(response).to.deep.eql({
            code: 200,
            description: 'Successfully created the invitemerchant'
        });

        const user = await request.get(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleAnotherUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const expiryDate = moment.utc().add(5, 'd')
            .format();

        expect(user).not.to.be.null;
        expect(user.merchantInvites).to.be.instanceOf(Array).and.have.lengthOf(2);
        expect(user.merchantInvites[1].merchantID).to.eql(sampleMerchant2._id);
        expect((new Date(user.merchantInvites[1].inviteExpiryDate)).getDate()).to.eql((new Date(expiryDate).getDate()));// check expiry date


    });


    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleAnotherUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});