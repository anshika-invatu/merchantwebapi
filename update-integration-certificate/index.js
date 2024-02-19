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
                    'You\'ve requested to update a new integrations but the request body seems to be empty. Kindly pass the integrations to be updated using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        
        const result = await request.patch(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/integration-certificate`, {
            json: true,
            headers: {
                'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
            },
            body: req.body
        });
        
        if (result) {
            context.res = {
                body: result
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
