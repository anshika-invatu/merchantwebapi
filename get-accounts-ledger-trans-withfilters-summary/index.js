'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const _ = require('underscore');

//Please refer the bac-327, 375 for further details

module.exports = (context, req) => {
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
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to get accountsLedgerTransactions doc but you did\'t send search parameters in the request body. Kindly pass the search parameter using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    if (!req.body.accountMerchantID) {
        utils.setContextResError(
            context,
            new errors.MissingAccountMerchantID(
                'accountMerchantID not found in request body.',
                401
            )
        );
        return Promise.reject();
    }
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            for (var i = 0, len = user.merchants.length; i < len; i++) {
                if (user.merchants[i].merchantID === req.body.accountMerchantID) {   //Validate whether user is allowed to see merchant data or not?
                    isMerchantLinked = true;
                    const url = `${process.env.LEDGERS_API_URL}/api/${process.env.LEDGERS_API_VERSION}/accounts-ledger-trans-withfilters`;
                    return request.post(url, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.LEDGERS_API_KEY
                        },
                        body: req.body
                    })
                        .then(accountsLedgerTransactions => {
                            if (accountsLedgerTransactions && Array.isArray(accountsLedgerTransactions)) {
                                const allTransactions = [];
                                accountsLedgerTransactions.forEach(accountsLedgerTransaction => {
                                    if (accountsLedgerTransaction.transactions && Array.isArray(accountsLedgerTransaction.transactions) && accountsLedgerTransaction.isSettled === false) {
                                        accountsLedgerTransaction.transactions.forEach(element => {
                                            allTransactions.push(element);
                                        });
                                    }
                                });
                                const result = _.groupBy(allTransactions, 'productClass');
                                const res = [];
                                for (var key in result) {
                                    let clearingAmount = 0, vatAmount = 0, count = 0;
                                    let productClassName;
                                    if (result[key] && Array(result[key])) {
                                        result[key].forEach(element => {
                                            productClassName = element.productClassName;
                                            clearingAmount = clearingAmount + element.clearingAmount;
                                            vatAmount = vatAmount + element.vatAmount;
                                            count++;
                                        });
                                    }
                                    res.push({ productClass: key,
                                        productClassName: productClassName,
                                        clearingAmountSum: clearingAmount,
                                        vatAmountSum: vatAmount,
                                        numberOfTrans: count });
                                }
                                
                                context.res = {
                                    body: res
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
