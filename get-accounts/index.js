'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//BASE-138

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
        const result = await request.get(`${process.env.BILLING_SERVICE_API_URL}/api/v1/merchants/${req.params.id}/accounts/${req.params.accountID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.BILLING_SERVICE_API_KEY
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
