'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-306 for this endpoint related details

module.exports = (context, req) => {
    let isReqBodyHaveAnyField;
    const merchantIDs = [];
    let isUserHaveMerchants = false;
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
                'You\'ve requested to get vouchers but the request body seems to be empty. Kindly pass the atleast one parameter using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    for (var prop in req.body) {
        if (req.body.hasOwnProperty(prop)) {
            isReqBodyHaveAnyField = true;
        }
    }
    if (!isReqBodyHaveAnyField) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to get vouchers but the request body seems to be empty. Kindly pass the atleast one parameter using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            for (var i = 0, len = user.merchants.length; i < len; i++) {
                isUserHaveMerchants = true;
                merchantIDs.push((user.merchants[i].merchantID));
            }
            req.body.merchantIDs = merchantIDs;
            if (isUserHaveMerchants) {
                const url = `${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers-withfilters`;
                return request.post(url, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.VOUCHER_API_KEY
                    },
                    body: req.body
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'This User don\'t have any merchant',
                        401
                    )
                );
            }

        })
        .then(vouchers => {
            if (vouchers) {
                context.res = {
                    body: vouchers
                };
            }
        })
        .catch(error => {
            context.error(error);
            utils.handleError(context, error);
        });


};
