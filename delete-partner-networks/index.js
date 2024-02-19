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

    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
            return request.delete(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/merchants/${req.params.id}/partner-networks/${req.params.partnerNetworkID}`, {
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
        .then(result =>{
            if (result) {
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
