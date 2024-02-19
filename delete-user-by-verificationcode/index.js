'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-192 for this endpoint related details

module.exports = function (context, req) {
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
    const token = utils.decodeToken(req.headers.authorization);
    return request.delete(`${process.env.USER_API_URL}/api/v1/delete-user/${req.params.verificationCode}?userID=${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        context.res = {
            body: result
        };
    })
        .catch(error => utils.handleError(context, error));
};