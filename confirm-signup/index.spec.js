'use strict';

const expect = require('chai').expect;
const helpers = require('../spec/helpers');
const request = require('request-promise');
const uuid = require('uuid');

describe('Confirm Signup', () => {

    it('should return error with status code 400 when request body is null', async () => {
        try {
            await request.post(helpers.API_URL + '/api/v1/confirmsignup', {
                json: true,
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'You have requested for signup confirmation but the request body seems to be empty.',
                reasonPhrase: 'EmptyRequestBodyError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    it('should throw error with status code 400 on invalid password', async () => {
        try {
            await request.post(`${helpers.API_URL}/api/v1/confirmsignup`, {
                json: true,
                body: {
                    password: 'test',
                    _id: uuid.v4()
                },
                headers: {
                    'x-functions-key': process.env.X_FUNCTIONS_KEY
                }
            });
        } catch (error) {
            const response = {
                code: 400,
                description: 'Password length must be minimum 8 characters or maximum 50 characters long.',
                reasonPhrase: 'FieldValidationError'
            };

            expect(error.statusCode).to.equal(400);
            expect(error.error).to.eql(response);
        }
    });

    

});