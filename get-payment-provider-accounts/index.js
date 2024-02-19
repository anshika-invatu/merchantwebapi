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
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const userMerchants = [];
        if (user && Array.isArray(user.merchants) && user.merchants.length) {
            user.merchants.forEach(element => {
                userMerchants.push(element.merchantID);
            });
        }
        if (req.query.merchantID && !userMerchants.includes(req.query.merchantID)) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Merchants not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
        const result = await request.get(`${process.env.PAYMENT_API_URL}/api/${process.env.PAYMENT_API_VERSION}/payment-provider-accounts?${context.req.originalUrl.split('?')[1]}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PAYMENT_API_KEY
            },
            body: { userMerchants: userMerchants }
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