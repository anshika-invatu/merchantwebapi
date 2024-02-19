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
        
        const result = await request.post(`${process.env.MAINTENANCE_API_URL}/api/${process.env.MAINTENANCE_API_VERSION}/merchants/${req.params.id}/events`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MAINTENANCE_API_KEY
            },
            body: req.body
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
