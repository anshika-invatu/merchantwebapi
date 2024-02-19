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

    const userMerchantIDs = new Array();
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            userMerchantIDs.push(user.merchants[i].merchantID);
        }
        return request.get(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/partner-networks/${req.params.partnerNetworkID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            }
        });
        
    })
        .then(partnerNetwork => {
            let isAbleToUpdate = false;
            if (partnerNetwork && partnerNetwork.partnerNetworkMembers && Array.isArray(partnerNetwork.partnerNetworkMembers)) {
                partnerNetwork.partnerNetworkMembers.forEach(element => {
                    if (userMerchantIDs.includes(element.merchantID)) {
                        isAbleToUpdate = true;
                    }
                });
            }
            if (isAbleToUpdate) {
                context.res = {
                    body: partnerNetwork
                };
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'This merchant is not a member of partner networks.',
                        401
                    )
                );
            }
        })
        .catch(error => utils.handleError(context, error));
};
