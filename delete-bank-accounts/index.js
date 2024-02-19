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

    if (!req.query) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'You\'ve requested to delete a bank account but the query string seems to be empty. Kindly specify the query string field',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.query.merchantID || !req.query.account) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide merchantID and account field in query string',
                400
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
            if (user.merchants[i].merchantID === req.query.merchantID) { //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.query.merchantID}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                }).then(merchant => {
                    let bankAccountExist = false;
                    const bankAccountArray = [];
                    if (merchant) {
                        if (Array.isArray(merchant.payoutBankAccounts)) {
                            merchant.payoutBankAccounts.forEach(element => {
                                if (element.account === req.query.account) {
                                    bankAccountExist = true;
                                } else {
                                    bankAccountArray.push(element);
                                }
                            });
                        }
                        if (bankAccountExist) {
                            return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.query.merchantID}`, {
                                body: { payoutBankAccounts: bankAccountArray },
                                json: true,
                                headers: {
                                    'x-functions-key': process.env.MERCHANT_API_KEY
                                }
                            });
                        } else {
                            utils.setContextResError(
                                context,
                                new errors.PayoutBankAccountsNotFoundError(
                                    'Bank account not exist',
                                    404
                                )
                            );
                        }
                    }
                }).
                    then(result => {
                        if (result && result.description.match(/Successfully/)) {
                            const logMessage = {};
                            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                            logMessage.operation = 'Delete';
                            logMessage.result = 'Delete bank account call completed successfully';
                            utils.logInfo(logMessage);
                            context.res = {
                                body: {
                                    code: 200,
                                    description: 'Successfully deleted payout bank account'
                                }
                            };
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
