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
    try {
        
        const result = await request.patch(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/merchants/${req.params.id}/voucher/${req.params.voucherID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.VOUCHER_API_KEY
            },
            body: req.body
        });
        context.res = {
            body: result
        };
        
    } catch (error) {
        utils.handleError(context, error);
    }
};
