'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-310,394 for this endpoint related details

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
                'Please provide body parameters merchantID,userID and role',
                400
            )
        );
        return Promise.reject();
    }

    if (!req.body.merchantID || !req.body.userID || !req.body.role) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide body parameters merchantID,userID and role',
                400
            )
        );
        return Promise.reject();
    }

    if (req.body.role !== 'admin' && req.body.role !== 'sales' &&
        req.body.role !== 'finance' && req.body.role !== 'posstaff' &&
        req.body.role !== 'viewer') {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide correct value of role',
                400
            )
        );
        return Promise.reject();
    }

    return utils.validateUUIDField(context, `${req.body.userID}`, 'The userID field specified in the request body does not match the UUID v4 format.')
        .then(() => utils.validateUUIDField(context, `${req.body.merchantID}`, 'The merchantID field specified in the request body does not match the UUID v4 format.'))
        .then(() => {
            return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        })
        .then(user => {
            var isMerchantAccessible = false;
            if (user && Array.isArray(user.merchants) && user.merchants.length > 0) {
                user.merchants.forEach(element => {
                    if (element.merchantID === req.body.merchantID && element.roles === 'admin') {
                        isMerchantAccessible = true;
                    }
                });
                if (isMerchantAccessible) {
                    return request.post(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/set-user-role`, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.USER_API_KEY
                        },
                        body: req.body
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'user not allowed to modify role.',
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
        .then(result => {
            if (result) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Set the merchant role call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully set merchant role'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};