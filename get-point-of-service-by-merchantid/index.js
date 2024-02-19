'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//This endpoint get pointOfService doc(bac-165)

module.exports = (context, req) => {
    const executionStart = new Date();
    var isDeviceAccessible = false;
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

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user && Array.isArray(user.merchants) && user.merchants.length > 0) {

            if (req.params.id) {
                user.merchants.forEach(element => {
                    if (element.merchantID === req.params.id) {
                        isDeviceAccessible = true;
                    }
                });
            }
        }
    })
        .then(() => {

            if (isDeviceAccessible) {

                return request.get(`${process.env.DEVICE_API_URL}/api/v1/merchants/${req.params.id}/point-of-services?${context.req.originalUrl.split('?')[1]}`, {
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

        .then(pointOfService => {
            if (pointOfService) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Get';
                logMessage.result = 'Get point-of-service call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: pointOfService
                };
            }
        })

        .catch(error => utils.handleError(context, error));
};
