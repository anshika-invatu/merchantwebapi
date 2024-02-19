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
        const recipts = await request.get(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/receipts?` + req.originalUrl.split('?')[1], {
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            },
            json: true
        });
        context.res = {
            body: recipts
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};

