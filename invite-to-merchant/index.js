'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');
const moment = require('moment');
const uuid = require('uuid');
const sampleUser = require('../spec/sample-docs/Users');

//Please refer the bac-131,249 for further details

module.exports = (context, req) => {
    const executionStart = new Date();
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to add merchant in merchantInvites but the request body seems to be empty. Kindly specify the merchantID and email field using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.email || !req.body.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide email and merchantID field in request body',
                400
            )
        );
        return Promise.reject();
    }

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

    let merchant,loginUser;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        loginUser = user;
        let isMerchantAccessible = false;
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.merchantID && element.roles && element.roles.match(/admin/)) {
                    isMerchantAccessible = true;
                    merchant = element;
                }
            });

        }
        return isMerchantAccessible;

    })
        .then(isMerchantAccessible => {
            if (isMerchantAccessible) {
                return request.get(`${process.env.USER_API_URL}/api/v1/users/${req.body.email}/user`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'login user dont have permission to update another user for this merchantID',
                        401
                    )
                );
            }
        })
        .then(result => {
            if (result && result.length) {
                const anotherUser = result[0];
                let merchantAlreadyLinked = false;
                if (anotherUser && Array.isArray(anotherUser.merchants)) {
                    anotherUser.merchants.forEach(element => {
                        if (element.merchantID === req.body.merchantID) {
                            utils.setContextResError(
                                context,
                                new errors.MerchantLinkedError(
                                    'The merchant already linked with the user',
                                    403
                                )
                            );
                            merchantAlreadyLinked = true;
                        }
                    });

                }
                if (anotherUser && !merchantAlreadyLinked) {
                    const expiryDate = moment.utc().add(5, 'd')
                        .format();
                    const newMerchant = {
                        merchantID: merchant.merchantID,
                        merchantName: merchant.merchantName,
                        inviteExpiryDate: expiryDate
                    };
                    const newMerchantMember = {
                        merchantID: merchant.merchantID,
                        merchantName: merchant.merchantName,
                        roles: 'admin'
                    };
                    if (anotherUser.hasOwnProperty('merchantInvites') && Array.isArray(anotherUser.merchantInvites)) {
                        let isMerchantExist = false;
                        for (let i = 0; i < anotherUser.merchantInvites.length; i++) {
                            if (anotherUser.merchantInvites[i].merchantID === req.body.merchantID) {
                                anotherUser.merchantInvites[i].inviteExpiryDate = expiryDate;
                                isMerchantExist = true;
                            }
                        }
                        if (!isMerchantExist) {
                            anotherUser.merchantInvites.push(newMerchant);
                        }

                    } else {
                        anotherUser.merchantInvites = new Array(newMerchant);
                    }
                    if (anotherUser.hasOwnProperty('merchants') && Array.isArray(anotherUser.merchants)) {
                        let isMerchantExistMember = false;
                        for (let i = 0; i < anotherUser.merchants.length; i++) {
                            if (anotherUser.merchants[i].merchantID === req.body.merchantID) {
                                anotherUser.merchants[i].memberUpdateDate = new Date();
                                isMerchantExistMember = true;
                            }
                        }
                        if (!isMerchantExistMember) {
                            anotherUser.merchants.push(newMerchantMember);
                        }

                    } else {
                        anotherUser.merchantInvites = new Array(newMerchantMember);
                    }
                    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${anotherUser._id}`, {
                        body: { merchantInvites: anotherUser.merchantInvites, merchants: anotherUser.merchants },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.USER_API_KEY
                        }
                    });
                }
            } else if (result && result.length === 0) { //if user is not exist then create a new user(bac-161).
                sampleUser._id = uuid.v4();
                sampleUser.partitionKey = sampleUser._id;
                sampleUser.mobilePhone = '';
                sampleUser.email = req.body.email;
                sampleUser.country = loginUser.country;
                sampleUser.languageCode = loginUser.languageCode;
                sampleUser.languageName = loginUser.languageName;
                sampleUser.password = utils.generateRandomPassword();
                sampleUser.merchants = new Array({
                    merchantID: merchant.merchantID,
                    merchantName: merchant.merchantName,
                    roles: ''
                });
                if (sampleUser.consents && Array.isArray(sampleUser.consents)) { //BASE-70
                    for (let i = 0; i < sampleUser.consents.length; i++) {
                        sampleUser.consents[i].approvalDate = new Date();
                    }
                }
                
                return request.post(`${process.env.USER_API_URL}/api/v1/users`, {
                    body: sampleUser,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            }
        })
        .then(result => {
            if (result && result.code === 200) {
                return result;
            } else if (result && result.email === req.body.email) { // if new user is created
                var notificationMessge = {};
                notificationMessge._id = uuid.v4();
                notificationMessge.docType = 'notification';
                notificationMessge.notificationType = 'email';
                notificationMessge.partitionKey = notificationMessge._id;
                notificationMessge.receiver = { userID: sampleUser._id };
                notificationMessge.messageSubject = 'Vourity Invitation';
                notificationMessge.template = 'vourity-invitation';
                notificationMessge.templateFields = {
                    name: merchant.merchantName,
                    url: process.env.PORTAL_URL,
                    password: sampleUser.password,
                    user: loginUser.name
                };
                notificationMessge.updatedDate = new Date();
                notificationMessge.createdDate = new Date();
                utils.sendMessageToAzureBus(process.env.AZURE_BUS_TOPIC_NOTIFICATION_EMAIL, notificationMessge);
                return {
                    code: 200
                };
            }

        })
        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Create';
                logMessage.result = 'Create invitemerchant call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully created the invitemerchant'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
