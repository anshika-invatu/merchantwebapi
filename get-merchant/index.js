'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    let isMerchantLinked = false;
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

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.params.id) {   //Validate whether user is allowed to see merchant data or not?
                    isMerchantLinked = true;
                }
            });
            if (isMerchantLinked) {
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.id}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'MerchantID not linked to user',
                        401
                    )
                );
                return Promise.resolve();
            }
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'User is not linked to any Merchant',
                    401
                )
            );
            return Promise.resolve();
        }
    })
        .then(merchant => {
            if (merchant) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Get';
                logMessage.result = 'Get merchant call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: merchant
                };
            }
        })
        .catch(error => utils.handleError(context, error));
     
};
