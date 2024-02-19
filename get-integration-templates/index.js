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
        
        const result = await request.get(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/integration-templates?${context.req.originalUrl.split('?')[1]}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
            }
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
