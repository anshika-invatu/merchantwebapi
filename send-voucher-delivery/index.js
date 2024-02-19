'use strict';

const Promise = require('bluebird');
const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');

//Please refer bac-308 for this endpoint related details

module.exports = async (context, req) => {

    let order;
    var isAccessible = false;
    const walletIDs = [];
    const linkedPasses = [];
    const alreadySendNotification = [];
    try {
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
        const voucher = await request.get(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers/${req.body.voucherID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => { // Validate if the merchant id is in user merchant list.
                if (voucher && voucher.issuer && element.merchantID === voucher.issuer.merchantID) {
                    isAccessible = true;
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'No merchants linked to this user.',
                    401
                )
            );
            return Promise.resolve(null);
        }
        if (!isAccessible) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'voucher not accessible to this user.',
                    401
                )
            );
            return Promise.resolve(null);
        }
        if (voucher.notificationSubscribers && Array.isArray(voucher.notificationSubscribers)) {
            voucher.notificationSubscribers.forEach(element => {
                walletIDs.push(element.walletID);
            });
        }
        if (voucher.orderID) {
            order = await request.get(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/orders/${voucher.orderID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.ORDER_API_KEY
                }
            });
        }
        const allReq = [];
        walletIDs.forEach(element => {
            allReq.push(request.get(`${process.env.PASSES_API_URL}/api/${process.env.PASSES_API_VERSION}/wallets/${element}/passes`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PASSES_API_KEY
                }
            }));
        });
        return Promise.all(allReq)
            .then(passes => {
                if (passes && Array.isArray(passes)) {
                    passes.forEach(pass => {
                        pass.forEach(element => {
                            if (element.passToken) {
                                const passToken = utils.hashToken(element.passToken);
                                if (passToken.toLowerCase() === voucher.passToken) {
                                    linkedPasses.push(element);
                                }
                            }
                        });
                    });
                }

                let isMessageSend = false;
                linkedPasses.forEach(element => {
                    if (!alreadySendNotification.includes(element)) {
                        if (req.body.notificationType === 'email') {
                            const notificationDoc = {};
                            notificationDoc.docType = 'notification';
                            notificationDoc._id = uuid.v4();
                            notificationDoc.receiver = {};
                            notificationDoc.receiver.walletID = element.walletID;
                            notificationDoc.notificationType = 'email';
                            notificationDoc.createdDate = new Date();
                            notificationDoc.updatedDate = new Date();
                            notificationDoc.sentDate = new Date();
                            notificationDoc.messageSubject = 'Vourity Voucher Order Delivery';
                            notificationDoc.templateFields = {
                                webShopName: order.webShopName,
                                _id: order._id,
                                link: process.env.VOURITY_PASS_LINK + element.passToken
                            };
                            notificationDoc.template = 'order-delivery';
                            utils.sendMessageToAzureBus(process.env.AZURE_BUS_TOPIC_NOTIFICATION_EMAIL, notificationDoc);
                            isMessageSend = true;
                        } else if (req.body.notificationType === 'sms') {
                            const notificationDoc = {};
                            notificationDoc._id = uuid.v4();
                            notificationDoc.docType = 'notification';
                            notificationDoc.receiver = {};
                            notificationDoc.receiver.walletID = element.walletID;
                            notificationDoc.templateFields = {
                                passURL: process.env.VOURITY_PASS_LINK + element.passToken
                            };
                            notificationDoc.template = 'newOrder';
                            notificationDoc.notificationType = 'sms';
                            notificationDoc.createdDate = new Date();
                            notificationDoc.updatedDate = new Date();
                            notificationDoc.sentDate = new Date();
                            utils.sendMessageToAzureBus(process.env.AZURE_BUS_TOPIC_NOTIFICATION_SMS, notificationDoc);
                            isMessageSend = true;
                        }
                    }
                    alreadySendNotification.push(element);
                });
                if (isMessageSend) {
                    return true;
                }
            })
            .then(result => {
                if (result) {
                    context.res = {
                        body: {
                            code: 200,
                            description: 'Successfully send voucher delivery'
                        }
                    };
                }
            })
            .catch(error => utils.handleError(context, error));
    } catch (error) {
        utils.handleError(context, error);
    }
};