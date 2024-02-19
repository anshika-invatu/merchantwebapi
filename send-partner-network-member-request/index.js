'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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
                'You\'ve requested to send a partnerNetworkMemberRequest but the request body seems to be empty. Kindly pass the request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    let isMerchantLinked = false;
    if (!req.body.partnerNetworkID || !req.body.merchantID || !req.body.inviteCode) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide req body parameters partnerNetworkID, merchantID and inviteCode',
                400
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
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.merchantID && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
            return request.patch(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/send-partner-network-member-request`, {
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
                    'MerchantID not linked to this user.',
                    401
                )
            );
        }
    })
        .then(result => {
            if (result) {
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
