'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-303 for this endpoint related details

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
    let isMerchantLinked = false;
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to get order doc but you did\'t send search parameters in the request body. Kindly pass the search parameter using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    if (!req.body.merchantID) {
        utils.setContextResError(
            context,
            new errors.MissingMerchantID(
                'accountMerchantID not found in request body.',
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
    })
        .then(user => {
            for (var i = 0, len = user.merchants.length; i < len; i++) {
                if (user.merchants[i].merchantID === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                    isMerchantLinked = true;
                    const url = `${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/orders-withfilters`;
                    return request.post(url, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.ORDER_API_KEY
                        },
                        body: req.body
                    })
                        .then(orders => {
                            if (orders) {
                                context.res = {
                                    body: orders
                                };
                            }
                        })
                        .catch(error => utils.handleError(context, error));
                }
            }
            if (!isMerchantLinked) {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'MerchantID not linked to user',
                        401
                    )
                );
            }
        });

};
