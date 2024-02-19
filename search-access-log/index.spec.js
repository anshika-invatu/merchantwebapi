'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');

describe('Search AccessLog', () => {


    it('should return auth error', async () => {
        try {
            await request.patch(`${helpers.API_URL}/api/v1/merchants/${123}/search-access-log`, {
                body: {},
                json: true,
                headers: {}
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

});