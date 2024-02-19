'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    const executionStart = new Date();
    let updatedMerchant;
    let isBalanceAccounts = false;
    let isCashpools = false;
    const accountsArray = [];

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
            updatedMerchant = merchant;
            if (merchant) {
                if (merchant.balanceAccounts && Array.isArray(merchant.balanceAccounts)) {
                    merchant.balanceAccounts.forEach(element => {
                        if (element.balanceAccountID === req.params.id) {
                            isBalanceAccounts = true;
                        }
                    });
                }
                if (merchant.cashpools && Array.isArray(merchant.cashpools)) {
                    merchant.cashpools.forEach(element => {
                        if (element.balanceAccountID === req.params.id) {
                            isCashpools = true;
                        }
                    });
                }
                if (isCashpools || isBalanceAccounts) {
                    return request.delete(`${process.env.VOUCHER_API_URL}/api/v1/balance-accounts/${req.params.id}?merchantID=${req.query.merchantID}`, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.VOUCHER_API_KEY
                        }
                    });
                }
                if (!isCashpools && !isBalanceAccounts) {
                    utils.setContextResError(
                        context,
                        new errors.BalanceAccountNotLinkedError(
                            'This balance account id not found in this merchant.',
                            401
                        )
                    );
                }

            }
        })

        .then((balanceAccount) => {
            if (balanceAccount) {
                if (isBalanceAccounts) {
                    updatedMerchant.balanceAccounts.forEach(element => {
                        if (element.balanceAccountID !== req.params.id) {
                            accountsArray.push(element);
                        }
                    });
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.query.merchantID}`, {
                        body: { balanceAccounts: accountsArray },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } else if (isCashpools) {
                    updatedMerchant.cashpools.forEach(element => {
                        if (element.balanceAccountID !== req.params.id) {
                            accountsArray.push(element);
                        }
                    });
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.query.merchantID}`, {
                        body: { cashpools: accountsArray },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.BalanceAccountNotFoundError(
                            'This balance account not found in this merchant',
                            401
                        )
                    );
                }
            }
        })
        .then((merchantUpdate) => {
            if (merchantUpdate) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Delete';
                logMessage.result = 'Delete balance-account call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully delete balance account'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
