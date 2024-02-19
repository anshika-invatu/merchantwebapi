'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-120 for this endpoint related details

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

        const customer = await request.get(`${process.env.CUSTOMER_API_URL}/api/v1/customers/${req.params.customerID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });
        if (customer.merchantID !== req.params.id) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'This user is not able to access to this customer.',
                    401
                )
            );
            return Promise.reject();
        }
        const passes = await request.get(`${process.env.PASSES_API_URL}/api/${process.env.PASSES_API_VERSION}/customers/${req.params.customerID}/passes`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PASSES_API_KEY
            }
        });

        context.res = {
            body: passes
        };
        
    } catch (error) {
        utils.handleError(context, error);
    }
};
