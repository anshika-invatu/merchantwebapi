'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleMerchantID = uuid.v4();
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
const sampleContacts = { ...require('../spec/sample-docs/Contacts'), _id: uuid.v4(), merchantID: sampleMerchantID };
let authToken = '';

describe('Update Contact', () => {
    before(async () => {
        sampleUser.merchants[0].merchantID = sampleMerchantID;
        sampleContacts.merchantID = sampleMerchantID;
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
        await request.post(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/contact`, {
            json: true,
            body: sampleContacts,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });

    it('should throw error on incorrect merchant id field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/123/contact/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The merchant id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });
    it('should throw error on incorrect contact id field', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${uuid.v4()}/contact/123`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'The contact id specified in the URL does not match the UUID v4 format.',
                reasonPhrase: 'InvalidUUIDError'
            };
            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should update the document when all validation passes', async () => {
        const result = await request.patch(`${helpers.API_URL}/api/v1/merchants/${sampleContacts.merchantID}/contact/${sampleContacts._id}`, {
            json: true,
            headers: {
                'Authorization': authToken
            },
            body: { name: 'testName' }
        });

        expect(result).not.to.be.null;
        expect(result.description).to.eql('Successfully updated the specified contact');
    });


    it('should throw error if doc not exist in db.', async () => {
        try {
            await request.delete(`${helpers.API_URL}/api/v1/merchants/${sampleContacts.merchantID}/contact/${uuid.v4()}`, {
                json: true,
                headers: {
                    'Authorization': authToken
                }
            });
        } catch (error) {
            const response = {
                code: 404,
                description: 'The contact id specified in the URL doesn\'t exist.',
                reasonPhrase: 'ContactsNotFoundError'
            };
            expect(error.statusCode).to.equal(404);
            expect(error.error).to.eql(response);
        }
    });

    after(async () => {
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${sampleUser._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        await request.delete(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/merchants/${sampleContacts.merchantID}/contact/${sampleContacts._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
    });
});