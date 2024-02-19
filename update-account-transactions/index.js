'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//BASE-140

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
        if (!req.query.accountTransactionID) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'AccountTransactionID does not exist in request query.',
                    403
                )
            );
            return Promise.reject();
        }
        const result = await request.patch(`${process.env.BILLING_SERVICE_API_URL}/api/v1/merchants/${req.params.id}/account-transactions/${req.params.accountID}?${context.req.originalUrl.split('?')[1]}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
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
