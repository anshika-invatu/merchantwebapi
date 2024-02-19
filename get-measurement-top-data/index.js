'use strict';

const utils = require('../utils');
const errors = require('../errors');
const request = require('request-promise');

module.exports = async (context, req) => {
   
    //BASE-468
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

        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/top-measurement-data`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
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
