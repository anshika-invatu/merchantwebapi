'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const randomString1 = crypto.randomBytes(3).toString('hex');
const randomString2 = crypto.randomBytes(3).toString('hex');
const randomString3 = crypto.randomBytes(3).toString('hex');
const randomString4 = crypto.randomBytes(3).toString('hex');

const email = `test.${randomString}@vourity.com`;

const email1 = `test.${randomString1}@vourity.com`;
const email2 = `test.${randomString2}@vourity.com`;
const email3 = `test.${randomString3}@vourity.com`;
const email4 = `test.${randomString4}@vourity.com`;

const loginUser = { ...require('../spec/sample-docs/Users'),
    _id: uuid.v4(),
    email,
    name: 'Login User'
};
const sampleUser1 = { ...require('../spec/sample-docs/Users'),
    _id: uuid.v4(),
    email: email1,
    mobilePhone: '+463213131234a' + randomString,
    name: 'Test User 1'
};
const sampleUser2 = { ...require('../spec/sample-docs/Users'),
    _id: uuid.v4(),
    email: email2,
    mobilePhone: '+463213123312345b' + randomString,
    name: 'Test User 2'
};
const sampleUser3 = { ...require('../spec/sample-docs/Users'),
    _id: uuid.v4(),
    email: email3,
    mobilePhone: '+4632131233123456c' + randomString,
    name: 'Test User 3'
};
const sampleUser4 = { ...require('../spec/sample-docs/Users'),
    _id: uuid.v4(),
    email: email4,
    mobilePhone: '+46321312331234567d' + randomString,
    name: 'Test User 4'
};
const sampleMerchantID = uuid.v4();

let authToken = '';

describe('Get team', () => {
    before(async () => {

        loginUser.merchants = new Array({
            merchantID: sampleMerchantID,
            roles: 'admin,write'
        }, {
            merchantID: uuid.v4(),
            roles: 'view,write'
        }, {
            merchantID: uuid.v4(),
            roles: 'update,view'
        });

        sampleUser1.merchants = new Array({
            merchantID: sampleMerchantID,
            roles: 'view'
        }, {
            merchantID: uuid.v4(),
            roles: 'view,write'
        });

        sampleUser2.merchants = new Array({
            merchantID: sampleMerchantID,
            roles: 'view,write'
        }, {
            merchantID: uuid.v4(),
            roles: 'update,view'
        });

        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser1,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser2,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser3,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: sampleUser4,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.post(process.env.USER_API_URL + '/api/v1/users', {
            body: loginUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const token = await request.post(process.env.USER_API_URL + '/api/v1/login', {
            body: {
                email: loginUser.email,
                password: loginUser.password
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        authToken = token.token;
    });

    it('should throw error if merchantID not linked to user', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/get-team/${uuid.v4()}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY,
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


    it('should return users as a team', async () => {
        const result = await request.get(`${helpers.API_URL}/api/v1/get-team/${sampleMerchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        expect(result).not.to.be.null;
        expect(result.users).to.be.instanceOf(Array).and.have.lengthOf(3);
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${loginUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser1._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser2._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser3._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/v1/users/${sampleUser4._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});