'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer to bac-96 for more details
module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
    if (!utils.authenticateRequest(context, req) || token._id !== req.params.id) {
        utils.setContextResError(
            context,
            new errors.UserNotAuthenticatedError(
                'Unable to authenticate user.',
                401
            )
        );
        return Promise.reject();
    }

    return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/users/${req.params.id}/business-units`, {
        json: true,
        headers: {
            'x-functions-key': process.env.MERCHANT_API_KEY
        }
    })
        .then(result => {
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.operation = 'Get';
            logMessage.result = 'Get businessunits by userid call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: result
            };
        })
        .catch(error => utils.handleError(context, error));
};
