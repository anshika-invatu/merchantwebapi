'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-263, 269 for this endpoint related details

module.exports = function (context, req) {

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
                'Please provide body parameters merchantID,pspSource and pspSourceSecret',
                400
            )
        );
        return Promise.reject();
    }

    if (!req.body.merchantID || !req.body.pspSource || !req.body.pspSourceSecret) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide body parameters merchantID,pspSource and pspSourceSecret',
                400
            )
        );
        return Promise.reject();
    }


    let merchantDoc;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        var isMerchantAccessible = false;
        if (user && Array.isArray(user.merchants) && user.merchants.length > 0) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.merchantID && element.roles === 'admin') {
                    isMerchantAccessible = true;
                }
            });
            if (isMerchantAccessible) {
                return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.body.merchantID}`, { //Get price plan
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'user not allowed to modify this merchant',
                        401
                    )
                );
                return Promise.resolve();
            }
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'No merchants linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }

    })
        .then(merchant => {
            if (merchant) {
                merchantDoc = merchant;
                return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.body.merchantID}`, {
                    json: true,
                    body: {
                        pspSource: req.body.pspSource,
                        pspSourceSecret: req.body.pspSourceSecret
                    },
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }

        })
        .then(result => {
            if (result) {
                if (merchantDoc && merchantDoc.pspAccount && merchantDoc.pspSource) {
                    return utils.detachStripeSource(merchantDoc.pspAccount, merchantDoc.pspSource);
                } else {
                    return true;
                }

            }
        })
        .then(result => {
            if (result) {
                if (merchantDoc.pspAccount) {
                    return utils.createStripeSource(merchantDoc.pspAccount, req.body.pspSource);
                } else {
                    utils.setContextResError(
                        context,
                        new errors.FieldValidationError(
                            'Merchant pspAccount field not exist',
                            400
                        )
                    );
                }
            }
        })
        .then(result=>{
            if (result && merchantDoc && merchantDoc.vatNumber) {
                let invoiceAddress;
                if (merchantDoc.invoiceAddress && Array.isArray(merchantDoc.invoiceAddress) && merchantDoc.invoiceAddress.length) {
                    invoiceAddress = merchantDoc.invoiceAddress[0];
                }
                return utils.updateStripeCustomer(merchantDoc.pspAccount, merchantDoc.vatNumber, invoiceAddress, merchantDoc.merchantName);
            }
        })
        .then(result => {
            if (result) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Set the merchant psp source call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully set merchant psp source'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};