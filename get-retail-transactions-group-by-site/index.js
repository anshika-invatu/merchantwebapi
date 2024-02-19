'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-369 for this endpoint related details

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

        if (!req.body || !req.body.merchantID) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'please send the merchantID in the request.',
                    403
                )
            );
            return Promise.reject();
        }

        const retailTransactions = await request.post(`${process.env.ORDER_API_URL}/api/v1/retail-transaction-group-by-site`, {
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            },
            body: req.body
        });

        context.res = {
            body: retailTransactions
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
