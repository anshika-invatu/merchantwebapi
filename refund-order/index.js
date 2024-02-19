'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to refund order but the request body seems to be empty. Kindly pass request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    if (!req.body.orderID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide orderID in request body.',
                400
            )
        );
        return Promise.resolve();
    }
    let orderDoc;
    return request.get(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/orders/${req.body.orderID}`, { //Get order
        json: true,
        headers: {
            'x-functions-key': process.env.ORDER_API_KEY
        }
    })
        .then(result => {
            if (result) {
                orderDoc = result;
                return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
                    json: true,
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            }
        })
        .then(result => {
            var isProductAccessible = false;
            if (result && Array.isArray(result.merchants) && result.merchants.length > 0) {
                if (orderDoc && orderDoc.sellerMerchantID) {
                    result.merchants.forEach(element => { // Validate if the product issuer merchant is in user merchant list.
                        if (element.merchantID === orderDoc.sellerMerchantID && element.roles === 'admin') {
                            isProductAccessible = true;
                        }
                    });
                }
                if (isProductAccessible) {
                    return request.post(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/refund-order`, {
                        json: true,
                        body: req.body,
                        headers: {
                            'x-functions-key': process.env.ORDER_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'This user not have authentication to refund order',
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
                logMessage.result = 'Refund Order call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
