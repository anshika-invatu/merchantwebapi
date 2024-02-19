'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-118 for further details
module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
    if (!utils.authenticateRequest(context, req) || token._id !== req.params.id) {
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
                'You\'ve requested to update sendNotifications but the request body seems to be empty. Kindly specify sendNotifications field to be changed using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.sendNotifications || !(Object.keys(req.body.sendNotifications).length)) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide sendNotifications with its fields in request body',
                400
            )
        );
        return Promise.reject();
    }

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${req.params.id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(users => {
        if (users && users.sendNotifications) {
            if (req.body.sendNotifications.hasOwnProperty('viaEmail')) {
                users.sendNotifications.viaEmail = req.body.sendNotifications.viaEmail;
            }
            if (req.body.sendNotifications.hasOwnProperty('viaSMS')) {
                users.sendNotifications.viaSMS = req.body.sendNotifications.viaSMS;
            }
            if (req.body.sendNotifications.hasOwnProperty('viaPush')) {
                users.sendNotifications.viaPush = req.body.sendNotifications.viaPush;
            }
            if (req.body.sendNotifications.hasOwnProperty('onMerchantMemberRequest')) {
                users.sendNotifications.onMerchantMemberRequest = req.body.sendNotifications.onMerchantMemberRequest;
            }
            if (req.body.sendNotifications.hasOwnProperty('onMerchantMemberRemoval')) {
                users.sendNotifications.onMerchantMemberRemoval = req.body.sendNotifications.onMerchantMemberRemoval;
            }
            if (req.body.sendNotifications.hasOwnProperty('onProfileChanges')) {
                users.sendNotifications.onProfileChanges = req.body.sendNotifications.onProfileChanges;
            }
            if (req.body.sendNotifications.hasOwnProperty('onVourityNews')) {
                users.sendNotifications.onVourityNews = req.body.sendNotifications.onVourityNews;
            }
            if (req.body.sendNotifications.hasOwnProperty('onPayout')) {
                users.sendNotifications.onPayout = req.body.sendNotifications.onPayout;
            }
            if (req.body.sendNotifications.hasOwnProperty('onFailedTransaction')) {
                users.sendNotifications.onFailedTransaction = req.body.sendNotifications.onFailedTransaction;
            }
            if (req.body.sendNotifications.hasOwnProperty('onFailedPayout')) {
                users.sendNotifications.onFailedPayout = req.body.sendNotifications.onFailedPayout;
            }
            if (req.body.sendNotifications.hasOwnProperty('onSupportRequest')) {
                users.sendNotifications.onSupportRequest = req.body.sendNotifications.onSupportRequest;
            }
           
            return request.patch(`${process.env.USER_API_URL}/api/v1/users/${req.params.id}`, {
                json: true,
                body: { sendNotifications: users.sendNotifications },
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.SendNotificationNotFoundError(
                    'SendNotification do not exist',
                    404
                )
            );
        }
    }).
        then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Update sendNotification call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: { code: 200, description: 'Successfully updated the sendNotification' }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
