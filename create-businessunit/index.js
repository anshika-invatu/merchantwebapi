'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a business-units but the request body seems to be empty. Kindly specify the business-units properties to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        if (result && Array.isArray(result.merchants) && result.merchants.length > 0) {
            var isBusinessunitAccessible = false;
            if (req.body && req.body.merchantID) {
                result.merchants.forEach(element => { // Validate if the business-units merchant id is in user merchant list.
                    if (element.merchantID === req.body.merchantID) {
                        isBusinessunitAccessible = true;
                    }
                });
            }
            if (isBusinessunitAccessible) {
                return request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units`, {
                    json: true,
                    body: req.body,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'Businessunit not linked to the user',
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
                logMessage.result = 'Create business unit call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
