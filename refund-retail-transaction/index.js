'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
    context.log('requset body = ' + JSON.stringify(req.body));
    var token = utils.decodeToken(req.headers.authorization);
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
                'You\'ve requested to refund retail transaction but the request body seems to be empty. Kindly pass request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    if (!req.body.retailTransactionID || !req.body.reasonForRefund) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide all input parameters(retailTransactionID and reasonForRefund) in request body.',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        const retailTransaction = await request.get(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/retail-transaction/${req.body.retailTransactionID}`, { //Get order
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            }
        });
        const uesr = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isAccessible = false;
        if (uesr && Array.isArray(uesr.merchants) && uesr.merchants.length > 0) {
            if (retailTransaction && retailTransaction.merchantID) {
                uesr.merchants.forEach(element => {
                    if (element.merchantID === retailTransaction.merchantID && element.roles === 'admin') {
                        isAccessible = true;
                    }
                });
            }
        }
        
        if (!isAccessible) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'This user not have authentication to refund order',
                    401
                )
            );
            return Promise.resolve();
        }

        if (retailTransaction.retailTransactionStatusCode && (retailTransaction.retailTransactionStatusCode.toLowerCase() === 'refunded' ||
         retailTransaction.retailTransactionTypeCode.toLowerCase() === 'refund')) {
            utils.setContextResError(
                context,
                new errors.AlreadyRefundedError(
                    'This transaction already refunded.',
                    401
                )
            );
            return Promise.resolve();
        }
        
        if (retailTransaction.checkoutSessionID)
            req.body.checkoutSessionID = retailTransaction.checkoutSessionID;
        const result = await request.patch(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/finalize-checkout-session/${req.body.checkoutSessionID}`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            }
        });
            
        if (result) {
            if (result.reasonPhrase) {
                context.res = {
                    body: result
                };
            } else {
                const updatedTransaction = await request.patch(`${process.env.ORDER_API_URL}/api/v1/retail-transaction/${req.body.retailTransactionID}`, {
                    body: { retailTransactionStatusCode: 'Refunded',
                        retailTransactionStatusText: 'Refunded',
                        retailTransactionTypeCode: 'refund' },
                    json: true,
                    headers: {
                        'x-functions-key': process.env.ORDER_API_KEY
                    }
                });
                if (updatedTransaction)
                    context.res = {
                        body: {
                            code: 200,
                            description: 'Successfully refund retail transaction.'
                        }
                    };
            }
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
