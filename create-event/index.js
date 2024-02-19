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
                    'You\'ve requested to create a new event but the request body seems to be empty. Kindly pass the event to be created using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        
        const result = await request.post(`${process.env.MAINTENANCE_API_URL}/api/${process.env.MAINTENANCE_API_VERSION}/event`, {
            body: req.body,
            json: true,
            headers: {
                'x-functions-key': process.env.MAINTENANCE_API_KEY
            }
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
