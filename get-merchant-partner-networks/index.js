'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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
    return request.get(`${process.env.VOUCHER_API_URL}/api/${process.env.VOUCHER_API_VERSION}/merchant/${req.params.id}/merchant-partner-networks`, {
        json: true,
        headers: {
            'x-functions-key': process.env.VOUCHER_API_KEY
        }
    })
        .then(partnerNetwork => {
            context.res = {
                body: partnerNetwork
            };
        })
        .catch(error => utils.handleError(context, error));
};
