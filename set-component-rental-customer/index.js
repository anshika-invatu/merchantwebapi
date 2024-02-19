'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-579 for this endpoint related details

module.exports = async function (context, req) {
    try {
        if (!utils.authenticateRequest(context, req)) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Unable to authenticate user.',
                    401
                )
            );
            return Promise.reject();
        }

        if (!req.body) {
            utils.setContextResError(
                context,
                new errors.EmptyRequestBodyError(
                    'You\'ve requested to set a component rentalcustomer but the request body seems to be empty. Kindly specify params using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isAccessible;
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => { // Validate if the merchant id is in user merchant list.
                if (element.merchantID === req.body.merchantID && element.roles === 'admin') {
                    isAccessible = true;
                }
            });
        }
        if (!isAccessible) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'No merchants linked to this user.',
                    401
                )
            );
            return Promise.resolve(null);
        }
        const result = await request.patch(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/set-component-rental-customer`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: req.body
        });

        if (result) {
            context.res = {
                body: {
                    code: 200,
                    description: 'Successfully set pos status.'
                }
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};