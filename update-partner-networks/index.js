'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
    
    const updatePartnerNetworkRequest = {};
    updatePartnerNetworkRequest.updatePartnerNetworkRequest = req.body;
    await utils.logInfo(updatePartnerNetworkRequest);

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
                'You\'ve requested to update partnerNetwork but the request body seems to be empty. Kindly pass the partnerNetwork fields to be updated using request body in application/json format',
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
            if (user.merchants[i].merchantID === req.params.id) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
            const body = {};
            if (req.body.partnerNetworkName) {
                body.partnerNetworkName = req.body.partnerNetworkName;
            }
            if (req.body.partnerNetworkDescription) {
                body.partnerNetworkDescription = req.body.partnerNetworkDescription;
            }
            if (req.body.isVisible) {
                body.isVisible = req.body.isVisible;
            }
            if (req.body.isEnabledForSale) {
                body.isEnabledForSale = req.body.isEnabledForSale;
            }
            if (req.body.commissionAmount) {
                body.commissionAmount = req.body.commissionAmount;
            }
            if (req.body.commissionPercent) {
                body.commissionPercent = req.body.commissionPercent;
            }
            if (req.body.feeMonthlyMembershipAmount) {
                body.feeMonthlyMembershipAmount = req.body.feeMonthlyMembershipAmount;
            }
            if (req.body.imageURL) {
                body.imageURL = req.body.imageURL;
            }
            if (req.body.moreInfoURL) {
                body.moreInfoURL = req.body.moreInfoURL;
            }
            if (req.body.currency) {
                body.currency = req.body.currency;
            }
            return request.patch(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/merchants/${req.params.id}/partner-networks/${req.params.partnerNetworkID}`, {
                body: body,
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
