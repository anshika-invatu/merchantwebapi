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
                'You\'ve requested to update partnerNetworkMember but the request body seems to be empty. Kindly pass the partnerNetworkMember fields to be updated using request body in application/json format',
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
    }).then(user => {
        let isMerchantLinked = false;
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.requestedMerchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
           
            return request.patch(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/partner-networks/${req.params.partnerNetworkID}`, {
                body: req.body,
                json: true,
                headers: {
                    'x-functions-key': process.env.VOUCHER_API_KEY
                }
            });
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
