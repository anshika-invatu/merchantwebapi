'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');

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
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${req.params.id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user.isEnabled && !user.isLocked) {
            delete user.password;
            delete user.salt;
            delete user.lastLoginDate;
            delete user.lastFailedLoginDate;
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.operation = 'Get';
            logMessage.result = 'Get user call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: user
            };
        }
    })
        .catch(error => utils.handleError(context, error));
};
