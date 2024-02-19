'use strict';

const utils = require('../utils');
const errors = require('../errors');
const request = require('request-promise');

//Please refer the bac-166 for further details

module.exports = (context, req) => {

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
                'You\'ve requested to create a new passes but the request body seems to be empty. Kindly pass the request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.passTokenCount) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide passTokenCount in request body',
                401
            )
        );
        return Promise.resolve();
    }

    if (!req.body.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide merchantID in request body',
                401
            )
        );
        return Promise.resolve();
    }

    if (!req.body.passTokens) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide passTokens in request body',
                401
            )
        );
        return Promise.resolve();
    }
    if (!req.body.productID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide productID in request body',
                401
            )
        );
        return Promise.resolve();
    }
    if (!req.body.webshopToken) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide webshopToken in request body',
                401
            )
        );
        return Promise.resolve();
    }
    const count = Number(req.body.passTokenCount);
    if (count < 0 || count > 1000 || isNaN(count)) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please give valid pass token count in request body',
                401
            )
        );
        return Promise.resolve();
    }

    const passTokens = [];
    req.body.passTokens.forEach(element => {
        passTokens.push(utils.validateUUIDField(context, element));
    });
    return Promise.all(passTokens)
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
                    if (element.merchantID === req.body.merchantID) {
                        isMerchantAccessible = true;
                    }
                });
                if (isMerchantAccessible) {
                    req.body.count = count;
                    return request.post(process.env.PASSES_API_URL + '/api/' + process.env.PASSES_API_VERSION + '/passes-docs', {
                        body: req.body,
                        json: true,
                        headers: {
                            'x-functions-key': process.env.PASSES_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'MerchantID not linked to this user',
                            401
                        )
                    );
                }

            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'MerchantID not linked to this user',
                        401
                    )
                );
            }
        })
        .then(passes => {
            if (passes) {
                context.res = {
                    body: passes
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
