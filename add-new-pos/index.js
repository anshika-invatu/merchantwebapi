'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the story BASE-62 for more details

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
        
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/v1/add-new-pos`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: req.body
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
