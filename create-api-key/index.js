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
        return Promise.reject();
    }

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a apiKey but the request body seems to be empty. Kindly specify apiKey fields to be created using request body in application/json format',
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
        let merchantName;
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                merchantName = user.merchants[i].merchantName;
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
        if (!req.body.adminRights)
            req.body.adminRights = [];
        req.body.adminRights.push({
            merchantID: req.params.id,
            merchantName: merchantName,
            roles: 'admin'
        });
        const result = await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/api-key`, {
            body: req.body,
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
