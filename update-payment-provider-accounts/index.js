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
        const result = await request.patch(`${process.env.PAYMENT_API_URL}/api/${process.env.PAYMENT_API_VERSION}/payment-provider-accounts/${req.params.id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PAYMENT_API_KEY
            },
            body: {
                user: { userMerchants: userMerchants },
                updatedPaymentProviderAcc: req.body
            }
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