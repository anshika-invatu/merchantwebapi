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

    if (!req.query.partnerNetworkID && !req.query.partnerNetworkName && !req.query.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide atleast one (partnerNetworkID, partnerNetworkNameand merchantID) parameter in query',
                400
            )
        );
        return Promise.reject();
    }
    
    return request.get(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/search-partner-network?` + context.req.originalUrl.split('?')[1], {
        json: true,
        headers: {
            'x-functions-key': process.env.VOUCHER_API_KEY
        }
    })
        .then(result => {
            if (result)
                context.res = {
                    body: result
                };
        })
        .catch(error => utils.handleError(context, error));

};
