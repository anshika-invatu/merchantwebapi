'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-79 for further details

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
    let user;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        if (result && Array.isArray(result.merchants) && result.merchants.length > 0) {
            user = result;
            //Get Webshop
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/webshops/${req.params.id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
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
            return Promise.resolve();
        }
    })
        .then(result => {
            if (result) {
                var isWebshopAccessible = false;
                if (result.ownerMerchantID) {
                    user.merchants.forEach(element => { // Validate if the webshop owner merchant is in user merchant list.
                        if (element.merchantID === result.ownerMerchantID) {
                            isWebshopAccessible = true;
                        }
                    });
                }
                if (isWebshopAccessible) {
                    const logMessage = {};
                    logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                    logMessage.operation = 'Get';
                    logMessage.result = 'Get webshop call completed successfully';
                    utils.logInfo(logMessage);
                    context.res = {
                        body: result
                    };
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'Webshop not accessible to the user',
                            401
                        )
                    );
                    return Promise.resolve();
                }
            }
        })
        .catch(error => utils.handleError(context, error));
};
