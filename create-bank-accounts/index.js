'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');

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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a bank account but the request body seems to be empty. Kindly specify bank account fields to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.payoutBankAccount || !req.body.payoutBankAccount.account) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide bank account fields with account in request body',
                400
            )
        );
        return Promise.reject();
    }

    let isMerchantLinked = false, merchantDoc;
    const userID = utils.decodeToken(req.headers.authorization)._id;
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
                    merchantDoc = merchant;
                    let bankAccountArray = [];
                    if (merchant) {
                        if (Array.isArray(merchant.payoutBankAccounts)) {
                            bankAccountArray = merchant.payoutBankAccounts.map(x => x.account);
                            merchant.payoutBankAccounts.push(req.body.payoutBankAccount);

                        } else {
                            merchant.payoutBankAccounts = new Array(req.body.payoutBankAccount);
                        }
                        if (bankAccountArray.indexOf(req.body.payoutBankAccount.account) === -1) {
                            return request.patch(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.merchantID}`, {
                                body: { payoutBankAccounts: merchant.payoutBankAccounts },
                                json: true,
                                headers: {
                                    'x-functions-key': process.env.MERCHANT_API_KEY
                                }
                            });
                        } else {
                            utils.setContextResError(
                                context,
                                new errors.BankAccountAlreadyExistError(
                                    'Bank account already exist',
                                    403
                                )
                            );
                        }
                    }
                }).
                    then(result => {
                        if (result && result.description.match(/Successfully/)) {
                            const merchantLog = {};
                            merchantLog._id = uuid.v4();
                            merchantLog.docType = 'merchantLog';
                            merchantLog.partitionKey = merchantLog._id;
                            merchantLog.userID = userID;
                            merchantLog.merchantID = merchantDoc._id;
                            merchantLog.merchantName = merchantDoc.merchantName;
                            merchantLog.actionText = 'Bank account created';
                            merchantLog.actionCode = 'created';
                            merchantLog.statusText = 'OK';
                            merchantLog.statusCode = 'ok';
                            merchantLog.result = 'changes done';
                            merchantLog.createdDate = new Date();
                            merchantLog.updatedDate = new Date();
                            return request.post(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/merchant-log`, {
                                json: true,
                                body: merchantLog,
                                headers: {
                                    'x-functions-key': process.env.MERCHANT_API_KEY
                                }
                            });
                        }
                    })
                    .then(result => {
                        if (result) {
                            const logMessage = {};
                            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                            logMessage.operation = 'Create';
                            logMessage.result = 'Create bank account call completed successfully';
                            utils.logInfo(logMessage);
                            context.res = {
                                body: {
                                    payoutBankAccount: req.body.payoutBankAccount
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
