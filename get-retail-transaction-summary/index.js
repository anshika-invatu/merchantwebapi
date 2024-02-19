'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-294 for this endpoint related details

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
                    'You\'ve requested to get retail transaction summary but the request body seems to be empty. Kindly specify parameters in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        if (!req.body.merchantID) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'There is no merchantID in request body.',
                    403
                )
            );
            return Promise.resolve();
        }
        if (!req.body.fromDate || !req.body.toDate) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Date range fields are mandatory.',
                    403
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

        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
            return Promise.resolve();
        }
        
        const retailTransactions = await request.post(`${process.env.ORDER_API_URL}/api/v1/retail-transaction-summary`, {
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            },
            body: req.body
        });

        context.res = {
            body: retailTransactions
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
