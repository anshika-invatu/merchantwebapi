'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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
    try {
       
        const result = await request.post(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/usage-group-by-hour`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            }
        });
        context.res = {
            body: result
        };
        
    } catch (error) {
        utils.handleError(context, error);
    }
};
