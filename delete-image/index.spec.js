'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');
const crypto = require('crypto');
const randomString = crypto.randomBytes(3).toString('hex');
const email = `test.${randomString}@vourity.com`;
const sampleUser = { ...require('../spec/sample-docs/Users'), _id: uuid.v4(), email };
let authToken = '';
const imagePath = 'spec/sample-docs/test-image.jpg';
const blobName = 'test-image.jpg';
var fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');


describe('Delete blob from storage', () => {
    before(async () => {
        var connString = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING;
        const blobServiceClient = BlobServiceClient.fromConnectionString(connString);
        const containerName = process.env.BLOB_CONTAINER;
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        let imageData;
        await new Promise((resolve) => {
            fs.readFile(imagePath, 'utf8', (err, data) => {
                if (err)
                    console.log(err);
                imageData = data;
                resolve(data);
            });
        });
        const uploadBlobResponse = await blockBlobClient.upload(imageData, imageData.length);
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);

        await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/users', {
            body: sampleUser,
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const usertoken = await request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/login', {
            body: {
                email: sampleUser.email,
                password: sampleUser.password
            },
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        authToken = usertoken.token;
    });

    it('should throw error 401 if request is unauthenticate', async () => {
        try {
            await request.delete(helpers.API_URL + `/api/v1/image/${blobName}`, {
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

    it('should delete image in blob storage when all validation passes', async () => {
        const response = await request.delete(helpers.API_URL + `/api/v1/image/${blobName}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY,
                'Authorization': authToken
            }
        });

        
        expect(response).to.deep.eql({
            code: 200,
            description: 'Successfully deleted the blob'
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
        ]);
    });

});