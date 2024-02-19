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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a account list but the request body seems to be empty. Kindly specify account list fields to be created using request body in application/json format',
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
            if (user.merchants[i].merchantID === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.post(`${process.env.LEDGERS_API_URL}/api/v1/account-lists`, {
                    body: req.body,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.LEDGERS_API_KEY
                    }
                }).then(accountList => {
                    const logMessage = {};
                    logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                    logMessage.operation = 'Create';
                    logMessage.result = 'Create account list call completed successfully';
                    utils.logInfo(logMessage);
                    context.res = {
                        body: accountList
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
