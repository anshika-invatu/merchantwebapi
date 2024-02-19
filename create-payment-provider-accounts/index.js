'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//BASE-20
module.exports = async (context, req) => {
    try {
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
                    'You\'ve requested to create a new payment provider accounts but the request body seems to be empty. Kindly pass the payment provider accounts to be created using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isMerchantLinked = false;
        let userMerchant;
        if (user && Array.isArray(user.merchants) && user.merchants.length) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.merchantID) {
                    isMerchantLinked = true;
                    userMerchant = element;
                }
            });
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Merchants not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
        if (!req.body.adminRights)
            req.body.adminRights = [];
        req.body.adminRights.push({
            merchantID: req.body.merchantID,
            merchantName: userMerchant.merchantName,
            roles: 'admin'
        });
        const result = await request.post(`${process.env.PAYMENT_API_URL}/api/${process.env.PAYMENT_API_VERSION}/payment-provider-accounts`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PAYMENT_API_KEY
            },
            body: req.body
        });

        if (result) {
            context.res = {
                body: result
            };
        }
      
    } catch (error) {
        utils.handleError(context, error);
    }
};