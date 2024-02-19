'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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

    if (!req.query.invoiceID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'You requested to get invoice details but not specified invoiceID in query string',
                400
            )
        );
        return Promise.resolve();
    }

    let isMerchantLinked = false, merchant;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) { //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.id}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                }).then(response => {
                    if (response) {
                        merchant = response;
                        return utils.getInvoiceDetails(req.query.invoiceID);
                    }
                }).
                    then(result => {
                        if (result && !result.customer && result.match(/No such invoice:/)) {
                            utils.setContextResError(
                                context,
                                new errors.InvoiceNotFoundError(
                                    'Invoice of specified Id not exist',
                                    404
                                )
                            );

                        } else if (result && result.customer !== merchant.pspAccount) {
                            utils.setContextResError(
                                context,
                                new errors.UserNotAuthenticatedError(
                                    'InvoiceID not belong to specified merchant',
                                    401
                                )
                            );
                        } else if (result) {
                            const logMessage = {};
                            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                            logMessage.operation = 'Get';
                            logMessage.result = 'Get invoice details call completed successfully';
                            utils.logInfo(logMessage);
                            context.res = {
                                body: result
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
