'use strict';
const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//This endpoint get the pricePlans doc by using certain filters criteria _id, currency, country and languageCode (fields found in the Priceplans doc). At least one of these must be set in the request
//For more details please refer the story bac-85
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
    return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/priceplans?` + context.req.originalUrl.split('?')[1], {
        json: true,
        headers: {
            'x-functions-key': process.env.MERCHANT_API_KEY
        }
    })
        .then(result => {
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.operation = 'Get';
            logMessage.result = 'Get priceplans call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: result
            };
        })
        .catch(error => utils.handleError(context, error));

};
