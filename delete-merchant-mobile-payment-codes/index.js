'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    const executionStart = new Date();
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
    if (!req.query.mobilePaymentCodeID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide mobilePaymentCodeID query parameters for delete the mobilePaymentCode.',
                400
            )
        );
        return Promise.resolve();
    }

    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/merchants/${req.params.id}/merchant-mobile-payment-codes?mobilePaymentCodeID=${req.query.mobilePaymentCodeID}`, {
                    body: req.body,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.PRODUCT_API_KEY
                    }
                }).then(result => {
                    const logMessage = {};
                    logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                    logMessage.operation = 'Delete';
                    logMessage.result = 'Delete merchantMobilePaymentCode call completed successfully';
                    utils.logInfo(logMessage);
                    context.res = {
                        body: result
                    };
                })
                    .catch(error => utils.handleError(context, error));
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
        }
    });
};
