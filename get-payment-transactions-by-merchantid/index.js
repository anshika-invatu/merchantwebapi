'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const moment = require('moment');

//Please refer the bac-152 for further details

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

    if (req.query.fromDate && req.query.toDate) {
        if (!moment(req.query.fromDate, 'YYYY-MM-DD', true).isValid() || !moment(req.query.toDate, 'YYYY-MM-DD', true).isValid()) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide valid daterange in format YYYY-MM-DD.',
                    400
                )
            );
            return Promise.resolve();
        }
    }

    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) { //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.get(`${process.env.PAYMENT_API_URL}/api/v1/merchants/${req.params.id}/transactions`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.PAYMENT_API_KEY
                    }
                }).then(paymentTransactions => {
                    if (Array.isArray(paymentTransactions) && paymentTransactions.length) {
                        const transactionArray = [];
                        if (req.query.fromDate && req.query.toDate) {
                            const fromDate =  moment.utc(req.query.fromDate);
                            const toDate =  moment.utc(req.query.toDate);
                            paymentTransactions.forEach(element => {
                                if (element.transactionDate) {
                                    const transactionDate = moment.utc(element.transactionDate).startOf('day');
                                    if (transactionDate >= fromDate && transactionDate <= toDate) {
                                        transactionArray.push(element);
                                    }
                                }

                            });
                            if (transactionArray.length > 1) {
                                transactionArray.sort((a, b) => {
                                    return new Date(b.transactionDate) - new Date(a.transactionDate);
                                });
                            }
                        } else {
                            paymentTransactions.sort((a, b) => {
                                return new Date(b.transactionDate) - new Date(a.transactionDate);
                            });
                            if (paymentTransactions.length > 20) {
                                for (let i = 0; i < 20; i++) {
                                    transactionArray.push(paymentTransactions[i]);
                                }
                            } else {
                                transactionArray.push(...paymentTransactions);
                            }

                        }
                        const logMessage = {};
                        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                        logMessage.operation = 'Get';
                        logMessage.result = 'Get payment transactions call completed successfully';
                        utils.logInfo(logMessage);
                        context.res = {
                            body: transactionArray
                        };

                    } else {
                        utils.setContextResError(
                            context,
                            new errors.PaymentTransactionsNotFoundError(
                                'Payment transaction for this merchant not exist',
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
