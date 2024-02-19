'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the bac-133,322, 398 for further details

module.exports = (context, req) => {
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

    let isMerchantLinked = false;
    const allBalanceAccounts = [];
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.merchantID) { //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.merchantID}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                })
                    .then(merchant => {
                        if (merchant && merchant.balanceAccounts && Array.isArray(merchant.balanceAccounts)) {
                            merchant.balanceAccounts.forEach(element => {
                                allBalanceAccounts.push(element.balanceAccountID);
                            });
                            return request.get(`${process.env.VOUCHER_API_URL}/api/v1/merchants/${req.params.merchantID}/balance-accounts`, {
                                json: true,
                                headers: {
                                    'x-functions-key': process.env.VOUCHER_API_KEY
                                }
                            });
                        }
                    })
                    .then(balanceAccounts => {
                        if (balanceAccounts && Array.isArray(balanceAccounts)) {
                            const balanceAccountArray = [];
                            balanceAccounts.forEach(element => {
                                if (allBalanceAccounts.includes(element._id)) {
                                    balanceAccountArray.push(element);
                                }
                            });
                            const logMessage = {};
                            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                            logMessage.operation = 'Get';
                            logMessage.result = 'Get merchant balance call completed successfully';
                            utils.logInfo(logMessage);
                            context.res = {
                                body: balanceAccountArray
                            };
                        } else {
                            utils.setContextResError(
                                context,
                                new errors.MerchantBalanceNotFoundError(
                                    'Merchant balance for this merchant not exist',
                                    404
                                )
                            );
                        }
                    })
                    .catch(error => utils.handleError(context, error));
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
        }
    });
};
