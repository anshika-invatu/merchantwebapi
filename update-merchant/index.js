'use strict';

const utils = require('../utils');
const uuid = require('uuid');
const request = require('request-promise');
const errors = require('../errors');
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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You have requested to update merchant but the request body seems to be empty. Kindly pass the merchant fields using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }
    let isMerchantAccessible, response;
    const userID = utils.decodeToken(req.headers.authorization)._id;

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            if (user) {
                if (user.merchants && Array.isArray(user.merchants)) {
                    user.merchants.forEach(element => { // Validate if the merchant is in user merchant list.
                        if (element.merchantID === req.params.id) {
                            isMerchantAccessible = true;
                        }
                    });
                }
                if (isMerchantAccessible) {
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.id}`, {
                        json: true,
                        body: req.body,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'Merchant not linked to user',
                            401
                        )
                    );
                }
            }

        })
        .then(result => {
            if (result) {
                response = result;
                const merchantLog = {};
                merchantLog._id = uuid.v4();
                merchantLog.docType = 'merchantLog';
                merchantLog.partitionKey = merchantLog._id;
                merchantLog.userID = userID;
                merchantLog.merchantID = req.params.id;
                merchantLog.merchantName = req.body.merchantName;
                merchantLog.actionText = 'Merchant updated';
                merchantLog.actionCode = 'updated';
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
                logMessage.operation = 'Update';
                logMessage.result = 'Update Merchant call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: response
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
