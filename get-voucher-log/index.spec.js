'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');

describe('get-vouchers-withfilters', () => {

    it('should throw error if user not login', async () => {
        try {
            const url = `${helpers.API_URL}/api/v1/vouchers/${uuid.v4()}/voucherLog`;
            await request.get(url, {
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