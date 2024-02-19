'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
describe('Get Mobile PaymentProviders', () => {
  
    it('should throw error if the user not login', async () => {
        try {
            await request.get(`${helpers.API_URL}/api/v1/pos-actions`, {
               
                json: true
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