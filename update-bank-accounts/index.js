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
                'You\'ve requested to update a bank account but the query string seems to be empty. Kindly specify the query string field',
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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to update a bank account but the request body seems to be empty. Kindly specify bank account fields to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.payoutBankAccount) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide bank account fields with account in request body',
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
                    if (merchant) {
                        if (Array.isArray(merchant.payoutBankAccounts)) {
                            for (let i = 0; i < merchant.payoutBankAccounts.length; i++) {
                                if (merchant.payoutBankAccounts[i].account === req.query.account) {
                                    bankAccountExist = true;
                                    if (req.body.payoutBankAccount.bank) {
                                        merchant.payoutBankAccounts[i].bank = req.body.payoutBankAccount.bank;
                                    }
                                    if (req.body.payoutBankAccount.country) {
                                        merchant.payoutBankAccounts[i].country = req.body.payoutBankAccount.country;
                                    }
                                    if (req.body.payoutBankAccount.currency) {
                                        merchant.payoutBankAccounts[i].currency = req.body.payoutBankAccount.currency;
                                    }
                                    if (req.body.payoutBankAccount.accountType) {
                                        merchant.payoutBankAccounts[i].accountType = req.body.payoutBankAccount.accountType;
                                    }
                                    if (req.body.payoutBankAccount.iban) {
                                        merchant.payoutBankAccounts[i].iban = req.body.payoutBankAccount.iban;
                                    }
                                    if (req.body.payoutBankAccount.account) {
                                        merchant.payoutBankAccounts[i].account = req.body.payoutBankAccount.account;
                                    }
                                    if (req.body.payoutBankAccount.bic) {
                                        merchant.payoutBankAccounts[i].bic = req.body.payoutBankAccount.bic;
                                    }
                                    if (req.body.payoutBankAccount.lastPayout) {
                                        merchant.payoutBankAccounts[i].lastPayout = new Date(req.body.payoutBankAccount.lastPayout);
                                    }
                                }
                            }
                        }
                        if (bankAccountExist) {
                            return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.query.merchantID}`, {
                                body: { payoutBankAccounts: merchant.payoutBankAccounts },
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
                            logMessage.operation = 'Update';
                            logMessage.result = 'Update bank account call completed successfully';
                            utils.logInfo(logMessage);
                            context.res = {
                                body: {
                                    code: 200,
                                    description: 'Successfully updated payout bank account'
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
