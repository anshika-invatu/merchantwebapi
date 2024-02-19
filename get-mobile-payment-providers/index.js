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

    return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/mobile-payment-providers`, {
        json: true,
        headers: {
            'x-functions-key': process.env.PRODUCT_API_KEY
        }
    }).then(result => {
        const logMessage = {};
        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
        logMessage.operation = 'Get';
        logMessage.result = 'Get mobilePaymentProviders call completed successfully';
        utils.logInfo(logMessage);
        context.res = {
            body: result
        };
    })
        .catch(error => utils.handleError(context, error));

};
