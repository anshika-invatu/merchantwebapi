'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
    if (!utils.authenticateRequest(context, req)) {
        utils.setContextResError(
            context,
            new errors.UserNotAuthenticatedError(
                'Unable to authenticate user.',
                401
            )
        );
        return Promise.resolve();
    }
    if (!req.query.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide req query parameters merchantID',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        let isMerchantLinked = false;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'This Merchant is not linked to the login user',
                    401
                )
            );
            return Promise.resolve();
        }
        
        const result = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.id}/api-key?merchantID=${req.query.merchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        context.res = {
            body: result
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
