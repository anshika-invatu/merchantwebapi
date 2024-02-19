'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-78 for further details
module.exports = (context, req) => {
    const executionStart = new Date();// start time of request
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
        if (result && Array.isArray(result.merchants) && result.merchants.length > 0) {
            var isProductAccessible = false;
            if (req.body && req.body.issuer && req.body.issuer.merchantID) {
                result.merchants.forEach(element => { // Validate if the product issuer merchant is in user merchant list.
                    if (element.merchantID === req.body.issuer.merchantID) {
                        isProductAccessible = true;
                    }
                });
            }
            if (isProductAccessible) {

                return request.post(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products`, {
                    json: true,
                    body: req.body,
                    headers: {
                        'x-functions-key': process.env.PRODUCT_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'Issuer not linked to current logged in user.',
                        401
                    )
                );
                return Promise.resolve();
            }

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
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Create';
                logMessage.result = 'Create product call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
