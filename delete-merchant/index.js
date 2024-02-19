'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');


//For more details please refer story bac-108, 268
module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
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

    let merchantDoc, userMerchants, isMerchantAccessible,isVoucherLinked, merchantProducts = 0;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            if (user) {
                if (user.merchants && Array.isArray(user.merchants)) {
                    userMerchants = user.merchants;
                    user.merchants.forEach(element => { // Validate if the merchant is in user merchant list.
                        if (element.merchantID === req.params.id) {
                            if (element.roles && element.roles.match(/admin/)) {
                                isMerchantAccessible = true;
                            }
                        }
                    });
                    if (isMerchantAccessible) {
                        return request.get(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/issuer-merchants/${req.params.id}/vouchers`, {
                            json: true,
                            headers: {
                                'x-functions-key': process.env.VOUCHER_API_KEY
                            }
                        });

                    } else {
                        utils.setContextResError(
                            context,
                            new errors.UserNotAuthenticatedError(
                                'User not allowed to delete this merchant',
                                401
                            )
                        );
                        return Promise.resolve();
                    }
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'User is not linked to any Merchant',
                            401
                        )
                    );
                    return Promise.resolve();
                }

            }
        })
        .then(vouchers => {
            if (vouchers && Array.isArray(vouchers) && vouchers.length) {
                isVoucherLinked = true;
                utils.setContextResError(
                    context,
                    new errors.VouchersLinkedError(
                        'Voucher linked to this merchant',
                        403
                    )
                );
                return Promise.resolve();
            } else if (isMerchantAccessible) {
                return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.id}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }

        })
        .then(merchant => {
            merchantDoc = merchant;
            if (merchant && merchant.pspAccount) {
                return utils.deleteStripeCustomer(merchant.pspAccount);// Also immediately cancels any active subscriptions
            }
        })
        .then(stripeResults => {
            if (stripeResults) {
                return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/users/${token._id}/products`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.PRODUCT_API_KEY
                    }
                });
            }
        })
        .then(products => {
            if (products && Array.isArray(products) && products.length) {
                const productRequestArray = [];
                products.forEach(element => {
                    if (element.issuer.merchantID === req.params.id) {
                        merchantProducts++;
                        productRequestArray.push(request.delete(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${element._id}`, {
                            json: true,
                            headers: {
                                'x-functions-key': process.env.PRODUCT_API_KEY
                            }
                        }));
                    }
                });

                return Promise.all(productRequestArray);
            }
            return Promise.resolve(new Array());
        })
        .then(productsResult => {
            if (isMerchantAccessible && !isVoucherLinked && productsResult.length === merchantProducts) {
                return request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.id}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }

        })
        .then(merchantsResult => {
            if (merchantsResult && userMerchants && Array.isArray(userMerchants) && userMerchants.length) {
                return request.delete(`${process.env.USER_API_URL}/api/v1/merchants/${req.params.id}/users/${token._id}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            }
        })
        .then(async userResult => {
            if (userResult) {
                var notificationMessge = {};
                notificationMessge._id = uuid.v4();
                notificationMessge.receiver = { userID: token._id };
                notificationMessge.messageSubject = 'Merchant Account has been deleted';
                notificationMessge.messageBody = `You request to delete ${merchantDoc.merchantName} has now be processed. Kind regards the Vourity Team`;
                notificationMessge.updatedDate = new Date();
                notificationMessge.createdDate = new Date();
                await utils.sendMessageToAzureBus(process.env.AZURE_BUS_TOPIC_NOTIFICATION_EMAIL, notificationMessge);
                return Promise.resolve(userResult);
            }
        })
        .then(result => {
            if (result) {
                return request.delete(process.env.MERCHANT_API_URL + `/api/v1/merchants/${merchantDoc._id}/merchant-billing`, {
                    json: true,
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
                logMessage.operation = 'Delete';
                logMessage.result = 'Delete Merchant call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully deleted the specified merchant'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
