'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the bac-182 for further details

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
        const result = await request.delete(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/cancel-booking/${req.params.id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });
        context.res = {
            body: result
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
