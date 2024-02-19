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
    
    
    return request.get(`${process.env.LEDGERS_API_URL}/api/v1/vat-classes/${req.params.countryCode}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.LEDGERS_API_KEY
        }
    }).then(vatClasses => {
        const logMessage = {};
        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
        logMessage.operation = 'Get';
        logMessage.result = 'Get vat-classes call completed successfully';
        utils.logInfo(logMessage);
        context.res = {
            body: vatClasses
        };
    })
        .catch(error => utils.handleError(context, error));
};
