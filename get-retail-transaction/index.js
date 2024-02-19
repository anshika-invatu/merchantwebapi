'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-35 for this endpoint related details

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
        const merchantIds = [];
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            merchantIds.push(user.merchants[i].merchantID);
        }
        const retailTransactions = await request.get(`${process.env.ORDER_API_URL}/api/v1/retail-transaction/${req.params.id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            }
        });

        if (retailTransactions && merchantIds.includes(retailTransactions.merchantID)) {
            context.res = {
                body: retailTransactions
            };
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'This user is not able to get this Retail Transactions.',
                    401
                )
            );
            return Promise.reject();
        }
        
    } catch (error) {
        utils.handleError(context, error);
    }
};
