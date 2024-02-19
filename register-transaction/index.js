'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {

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
                    'You\'ve requested to registered account transaction but the request body seems to be empty. Kindly pass the input params to be created using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }

        const result = await request.post(`${process.env.BILLING_SERVICE_API_URL}/api/${process.env.BILLING_SERVICE_VERSION}/register-transaction`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
            },
            body: req.body
        });
        if (result)
            context.res = {
                body: result
            };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
