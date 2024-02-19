'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    const executionStart = new Date();
    let isAvailable = false;
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
                'You\'ve requested to update a balance account but the request body seems to be empty. Kindly specify balance account fields to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.query.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide merchantID field in request query url.',
                400
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
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.query.merchantID) {
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.query.merchantID}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'This merchantId not linked to this user.',
                        401
                    )
                );
            }
        }
    })
        .then((merchant) => {

            if (merchant) {
                if (Array.isArray(merchant.balanceAccounts)) {
                    merchant.balanceAccounts.forEach(element => {
                        if (element.balanceAccountID === req.params.id) {
                            isAvailable = true;
                        }
                    });
                }
                if (Array.isArray(merchant.cashpools)) {
                    merchant.cashpools.forEach(element => {
                        if (element.balanceAccountID === req.params.id) {
                            isAvailable = true;
                        }
                    });
                }
                if (isAvailable) {
                    return request.patch(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${req.params.id}?merchantID=${req.query.merchantID}`, {
                        body: req.body,
                        json: true,
                        headers: {
                            'x-functions-key': process.env.VOUCHER_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.BalanceAccountNotLinkedError(
                            'This balance account not found in this merchant',
                            401
                        )
                    );
                }
            }
        })
        .then(account => {
            if (account) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Update balance-account call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated balance account'
                    }

                };
            }

        })
        .catch(error => utils.handleError(context, error));
};
