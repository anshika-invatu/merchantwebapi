'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');

describe('Get Countries', () => {

    

    it('should give countries list on request successfull', async () => {

        const result = await request.get(`${helpers.API_URL}/api/v1/countries`, {
            json: true,
            headers: {
                'x-functions-key': process.env.X_FUNCTIONS_KEY
            }
        });

        expect(result).not.to.be.null;

    });

});