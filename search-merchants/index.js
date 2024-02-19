'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-271 for this endpoint related details

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
    
    return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/search-merchants?` + context.req.originalUrl.split('?')[1], {
        json: true,
        headers: {
            'x-functions-key': process.env.MERCHANT_API_KEY
        }
    })
        .then(result => {
            context.res = {
                body: result
            };
        })
        .catch(error => utils.handleError(context, error));

};
