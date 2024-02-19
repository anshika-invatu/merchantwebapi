'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
// This endpoint to Merchant Web API to get Products based on multiple optional filter criteria. Like Merchant id, merchant name, country, product name and description.
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
    
    return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products?` + context.req.originalUrl.split('?')[1], {
        json: true,
        headers: {
            'x-functions-key': process.env.PRODUCT_API_KEY
        }
    })
        .then(result => {
            context.res = {
                body: result
            };
        })
        .catch(error => utils.handleError(context, error));

};
