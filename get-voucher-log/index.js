'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-307 for this endpoint related details

module.exports = (context, req) => {
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
    let voucherDoc;

    return request.get(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/vouchers/${req.params.id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.VOUCHER_API_KEY
        }
    })
        .then(voucher => {
            if (voucher) {
                voucherDoc = voucher;
            }
            return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        })
        .then(user => {
            for (var i = 0, len = user.merchants.length; i < len; i++) {
                if (voucherDoc.issuer && voucherDoc.issuer.merchantID === user.merchants[i].merchantID) {
                    isUserHaveMerchants = true;
                }
            }
            if (isUserHaveMerchants) {
                const url = `${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/voucherLogs?voucherID=${req.params.id}`;
                return request.get(url, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.VOUCHER_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'Merchant is not linked with this user',
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
        .catch(error => utils.handleError(context, error));


};
