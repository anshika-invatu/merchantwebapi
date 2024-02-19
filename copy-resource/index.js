'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//Please refer the BASE-377 for further details
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
        const result = await request.patch(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/merchants/${req.params.id}/copy-resource/${req.params.resourceID}`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
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
