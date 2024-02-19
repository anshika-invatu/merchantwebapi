'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the BASE-552 for further details

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
        const result = await request.get(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/merchants/${req.params.id}/contact/${req.params.contactID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        context.res = {
            body: result
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
