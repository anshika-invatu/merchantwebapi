'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');

//This endpoint create pointOfService doc(bac-165)

module.exports = async (context, req) => {
    const executionStart = new Date();
    var isDeviceAccessible = false, pointOfServiceDoc;
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
                'You\'ve requested to create a new point-of-service but the request body seems to be empty. Kindly pass the point-of-service to be created using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }

    const userID = utils.decodeToken(req.headers.authorization)._id;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user && Array.isArray(user.merchants) && user.merchants.length > 0) {
            if (req.body && req.body.merchantID) {
                user.merchants.forEach(element => {
                    if (element.merchantID === req.body.merchantID) {
                        isDeviceAccessible = true;
                    }
                });
            }
        }
    })
        .then(() => {
            if (isDeviceAccessible) {
                return request.post(`${process.env.DEVICE_API_URL}/api/v1/point-of-services`, {
                    body: req.body,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.DEVICE_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'MerchantID linked to this user.',
                        401
                    )
                );
                return Promise.resolve();
            }
        })
        .then(async pointOfService => {
            if (pointOfService) {
                pointOfServiceDoc = pointOfService;
                let merchant;
                try {
                    merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.body.merchantID}`, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } catch (err) {
                    context.log('merchant not found with merchantID = ' + req.body.merchantID);
                }
                const merchantLog = {};
                merchantLog._id = uuid.v4();
                merchantLog.docType = 'merchantLog';
                merchantLog.partitionKey = merchantLog._id;
                merchantLog.userID = userID;
                merchantLog.merchantID = req.body.merchantID;
                if (merchant) {
                    merchantLog.merchantName = merchant.merchantName;
                }
                merchantLog.actionText = 'Point of Service created';
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
                logMessage.result = 'Create point-of-service call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: pointOfServiceDoc
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};

