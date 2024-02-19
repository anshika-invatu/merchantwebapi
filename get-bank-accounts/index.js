'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the bac-121 for further details

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
                }).then(merchant => {
                    if (merchant && Array.isArray(merchant.payoutBankAccounts) && merchant.payoutBankAccounts.length) {
                        const logMessage = {};
                        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                        logMessage.operation = 'Get';
                        logMessage.result = 'Get merchant bank accounts call completed successfully';
                        utils.logInfo(logMessage);
                        context.res = {
                            body: { payoutBankAccounts: merchant.payoutBankAccounts }
                        };
                    } else {
                        utils.setContextResError(
                            context,
                            new errors.PayoutBankAccountsNotFoundError(
                                'Payout bank accounts for this merchant not exist',
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
