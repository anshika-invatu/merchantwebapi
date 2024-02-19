'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the bac-350 for further details

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

    
    if (!req.query.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide merchantID',
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
            if (user.merchants[i].merchantID === req.query.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
            return request.get(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/partner-network-products/${req.params.partnerNetworkID}?${context.req.originalUrl.split('?')[1]}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.VOUCHER_API_KEY
                },
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'merchantID not linked to this user.',
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
