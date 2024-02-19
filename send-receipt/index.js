'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//Please refer the BASE-360 for further details
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
                'You\'ve requested to send receipt but the request body seems to be empty. Kindly pass the request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        const result = await request.post(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/merchants/${req.params.id}/send-receipt`, {
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
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
