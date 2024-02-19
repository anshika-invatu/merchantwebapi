'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');
// Please refer the story bac-116
module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
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


    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            if (user && user.merchants && Array.isArray(user.merchants)) {
                const merchantArray = [];
                user.merchants.forEach(element => {
                    if (element.merchantID !== req.params.merchantID) {
                        merchantArray.push(element);
                    }
                });
                if (user.merchants.length === merchantArray.length) { // check merchants section updated
                    utils.setContextResError(
                        context,
                        new errors.MerchantNotFoundError(
                            'The Merchant not linked to user',
                            404
                        )
                    );
                } else {
                    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
                        body: { merchants: merchantArray },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.USER_API_KEY
                        }
                    });
                   
                }
            }

        })
        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Delete';
                logMessage.result = 'Delete merchant-link call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully delete merchant-link from user'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
