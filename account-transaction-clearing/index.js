'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the bac-175 for further details

module.exports = async (context, req) => {

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
                'You\'ve requested to account transaction clearing but the request body seems to be empty. Kindly specify request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        const result = await request.post(`${process.env.BILLING_SERVICE_API_URL}/api/${process.env.BILLING_SERVICE_VERSION}/account-transaction-clearing`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            }
        });
        context.res = {
            body: result
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
