'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-418 for this endpoint related details

module.exports = (context, req) => {
    const executionStart = new Date();
    let updatedMerchant;
    let isAccountCreated;
    let isAvailable;
    let notAvailable;

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
                'You\'ve requested to create a balance account but the request body seems to be empty. Kindly specify balance account fields to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    req.body.balanceAmount = 0;

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.issuerMerchantID) {
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.body.ownerID}`, {
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
                updatedMerchant = merchant;
                if (req.body.balanceAccountType === 'balance' || req.body.balanceAccountType === 'voucher' ||
                 req.body.balanceAccountType === 'cashcard' || req.body.balanceAccountType === 'cashpool') {
                    if (merchant.balanceAccounts && Array.isArray(merchant.balanceAccounts)) {
                        merchant.balanceAccounts.forEach(element => {
                            if (element.balanceCurrency === req.body.balanceCurrency) {
                                isAvailable = true;
                                return isAvailable;
                            }
                        });
                        if (!isAvailable) {
                            notAvailable = true;
                            return notAvailable;
                        }
                    } else {
                        notAvailable = true;
                        return notAvailable;

                    }

                } else {
                    notAvailable = true;
                    return notAvailable;
                }
            }
        })
        .then(() => {
            if (isAvailable) {
                utils.setContextResError(
                    context,
                    new errors.BalanceAccountAlreadyExistError(
                        'This balanceCurrency already exist with this balance account.',
                        403
                    )
                );
            } else if (notAvailable) {
                return request.post(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/balance-accounts`, {
                    body: req.body,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.VOUCHER_API_KEY
                    }
                });
            }
        })
        .then(account => {
            if (account) {
                isAccountCreated = account;
                if (req.body.balanceAccountType === 'balance' || req.body.balanceAccountType === 'voucher' || req.body.balanceAccountType === 'cashcard') {
                    if (Array.isArray(updatedMerchant.balanceAccounts)) {
                        updatedMerchant.balanceAccounts.push({
                            balanceAccountID: account._id,
                            balanceAccountName: account.balanceAccountName,
                            balanceAccountDescription: account.balanceAccountDescription,
                            balanceAccountType: account.balanceAccountType,
                            balanceCurrency: account.balanceCurrency,
                            lastPayoutTransactionID: '',
                            lastPayout: ''
                        });
                    } else {
                        updatedMerchant.balanceAccounts = [{
                            balanceAccountID: account._id,
                            balanceAccountName: account.balanceAccountName,
                            balanceAccountDescription: account.balanceAccountDescription,
                            balanceAccountType: account.balanceAccountType,
                            balanceCurrency: account.balanceCurrency,
                            lastPayoutTransactionID: '',
                            lastPayout: ''
                        }];
                    }
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.body.ownerID}`, {
                        body: { balanceAccounts: updatedMerchant.balanceAccounts },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } else {
                    if (Array.isArray(updatedMerchant.cashpools)) {
                        updatedMerchant.cashpools.push({
                            balanceAccountID: account._id,
                            balanceAccountName: account.balanceAccountName,
                            balanceAccountDescription: account.balanceAccountDescription,
                            balanceAccountType: account.balanceAccountType,
                            balanceCurrency: account.balanceCurrency
                        });
                    } else {
                        updatedMerchant.cashpools = [{
                            balanceAccountID: account._id,
                            balanceAccountName: account.balanceAccountName,
                            balanceAccountDescription: account.balanceAccountDescription,
                            balanceAccountType: account.balanceAccountType,
                            balanceCurrency: account.balanceCurrency
                        }];
                    }
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.body.ownerID}`, {
                        body: { cashpools: updatedMerchant.cashpools },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                }

            }

        })
        .then(() => {
            if (isAccountCreated) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Create';
                logMessage.result = 'Create balance-account call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: isAccountCreated
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
