'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');

describe('Get Manufacturers', () => {
    it('should return doc document when all validation passes', async () => {
        const result = await request.post(`${helpers.API_URL}/api/v1/get-manufacturers`, {
            json: true,
            body: {
                languageCode: 'sv-SE'
            }
        });
        expect(result).not.to.be.null;
    });
});