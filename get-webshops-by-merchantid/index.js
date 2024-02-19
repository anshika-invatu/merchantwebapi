'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer to bac-98 for more details
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
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        var isWebShopAccessible = false;
        if (result && result.merchants && Array.isArray(result.merchants)) {
            result.merchants.forEach(element => { // Validate if the merchant id is in user merchant list.
                if (element.merchantID === req.params.id) {
                    isWebShopAccessible = true;
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'No merchants linked to this user.',
                    401
                )
            );
            return Promise.resolve(null);
        }
        if (isWebShopAccessible) {
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.id}/webshops`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        }
        utils.setContextResError(
            context,
            new errors.UserNotAuthenticatedError(
                'Webshop not accessible to this user.',
                401
            )
        );
        return Promise.resolve(null);
    })
        .then(result => {
            if (result && Array.isArray(result)) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Get';
                logMessage.result = 'Get webshops by merchantid call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));

};
