'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-117 for further details
module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
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

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user && Array.isArray(user.consents) && user.consents.length) {
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.operation = 'Get';
            logMessage.result = 'Get consents call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: {
                    consents: user.consents
                }
            };
        } else {
            utils.setContextResError(
                context,
                new errors.ConsentNotFoundError(
                    'The consents not found',
                    404
                )
            );
        }
    })
        .catch(error => utils.handleError(context, error));
};
