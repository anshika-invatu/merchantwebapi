'use strict';

const request = require('request-promise');
const utils = require('../utils');
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
                'You\'ve requested to delete merchant-link from user but the request body seems to be empty. Kindly specify the merchantID and userID field using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.userID || !req.body.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide userID and merchantID field in request body',
                400
            )
        );
        return Promise.reject();
    }

    let deleteAllowed = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            if (user && user.merchants && Array.isArray(user.merchants)) {
                const merchantIDs = user.merchants.map(merchants => merchants.merchantID);
                if (merchantIDs.indexOf(req.body.merchantID) === -1) {
                    utils.setContextResError(
                        context,
                        new errors.MerchantNotFoundError(
                            'The Merchant not linked to user',
                            404
                        )
                    );
                } else {
                    user.merchants.forEach(element => {
                        if (element.merchantID === req.body.merchantID && element.roles.match(/admin/)) {
                            deleteAllowed = true;
                        }
                    });
                    if (deleteAllowed) {
                        return request.get(`${process.env.USER_API_URL}/api/v1/users/${req.body.userID}`, {
                            json: true,
                            headers: {
                                'x-functions-key': process.env.USER_API_KEY
                            }
                        });

                    } else {

                        utils.setContextResError(
                            context,
                            new errors.UserNotAuthenticatedError(
                                'User do not have admin permission for this merchant',
                                403
                            )
                        );
                    }
                }
            }

        }).
        then(otherUser => {
            if (otherUser && otherUser.merchants && Array.isArray(otherUser.merchants)) {
                const merchantArray = [];
                otherUser.merchants.forEach(element => {
                    if (element.merchantID !== req.body.merchantID) { //removing merchant from user
                        merchantArray.push(element);
                    }
                });
                if (otherUser.merchants.length === merchantArray.length) { // check merchants section updated
                    utils.setContextResError(
                        context,
                        new errors.MerchantNotFoundError(
                            'The Merchant not linked to user',
                            404
                        )
                    );
                } else {
                    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${req.body.userID}`, {
                        body: { merchants: merchantArray },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.USER_API_KEY
                        }
                    });

                }
            }
        })
        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Delete';
                logMessage.result = 'Delete merchant link from another user call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully delete merchant-link from another user'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
