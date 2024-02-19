'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');

describe('Get Manufacturers', () => {
    it('should error without manufacturerID', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/get-manufacturer-models`, {
                json: true,
                body: { }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You\'ve requested to get manufacuturer models but manufacturerID seems to be empty. Kindly pass the manufacturerID using request body in application/json format',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });
    it('should return doc document when all validation passes', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/get-manufacturer-models`, {
            json: true,
            body: {
                manufacturerID: '1d5c4f0b-9110-4667-966f-548f7b7b19a9',
                languageCode: 'sv-SE'
            }
        });
        expect(result).not.to.be.null;
    });
});