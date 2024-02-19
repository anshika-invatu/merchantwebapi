'use strict';

const utils = require('../utils');
const errors = require('../errors');
const uuid = require('uuid');
const request = require('request-promise');

//Please refer the bac-166,285 for further details

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
                'Please provide passTokenCount, merchantID, webshopToken and productID in request body',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.passTokenCount || !req.body.merchantID || !req.body.webshopToken  || !req.body.productID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide passTokenCount, merchantID, webshopToken and productID in request body',
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

    const passTokenArray = new Array();

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        var isMerchantAccessible = false;
        if (user && Array.isArray(user.merchants) && user.merchants.length > 0) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.merchantID) {
                    isMerchantAccessible = true;
                }
            });
            if (isMerchantAccessible) {
                for (let i = 0; i < count; i++) {
                    passTokenArray.push(uuid.v4());
                }
                req.body.passTokens = passTokenArray;
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
        .then(result => {
            if (result) {
                context.res = {
                    body: passTokenArray
                };
            }
        });
};
