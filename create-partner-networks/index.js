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
                'You\'ve requested to create a new partnerNetwork but the request body seems to be empty. Kindly pass the partnerNetwork to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.ownerMerchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
            let isAdminMerchantAvailable = false;
            if (req.body.partnerNetworkMembers && Array.isArray(req.body.partnerNetworkMembers)) {
                req.body.partnerNetworkMembers.forEach(element => {
                    if (element.merchantID === req.body.ownerMerchantID) {
                        element.roles = 'admin';
                        isAdminMerchantAvailable = true;
                    }
                });
            } else {
                req.body.partnerNetworkMembers = new Array();
            }
            if (!isAdminMerchantAvailable) {
                req.body.partnerNetworkMembers.push({
                    merchantID: req.body.ownerMerchantID,
                    merchantName: req.body.ownerMerchantName,
                    commissionAmount: req.body.commissionAmount,
                    commissionPercent: req.body.commissionPercent,
                    feeMonthlyMembershipAmount: req.body.feeMonthlyMembershipAmount,
                    currency: req.body.currency,
                    inviteCode: req.body.inviteCode,
                    roles: 'admin'
                });
            }
            return request.post(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/partner-networks`, {
                body: req.body,
                json: true,
                headers: {
                    'x-functions-key': process.env.VOUCHER_API_KEY
                }
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
