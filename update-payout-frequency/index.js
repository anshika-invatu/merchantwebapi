'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-120 for further details
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
                'You have requested to update merchant payout frequency but the request body seems to be empty. Kindly pass the merchant payout frequency fields using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }
    const validPayoutFrequencies = ['monthly', 'weekly', 'daily'];
    if (!req.body.payoutFrequency || validPayoutFrequencies.indexOf(req.body.payoutFrequency) === -1) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide valid value of payout frequency',
                400
            )
        );
        return Promise.reject();
    }
    let isMerchantAccessible;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            if (user) {
                if (user.merchants && Array.isArray(user.merchants)) {
                    user.merchants.forEach(element => { // Validate if the merchant is in user merchant list.
                        if (element.merchantID === req.params.merchantID) {
                            isMerchantAccessible = true;
                        }
                    });
                }
                if (isMerchantAccessible) {
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.merchantID}`, {
                        json: true,
                        body: { payoutFrequency: req.body.payoutFrequency },
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'Merchant not linked to user',
                            401
                        )
                    );
                }
            }

        })
        .then(result => {
            if (result) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Update payout frequency call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
