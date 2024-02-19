'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    var token = utils.decodeToken(req.headers.authorization);
    if (!utils.authenticateRequest(context, req) || token._id !== req.params.id) {
        utils.setContextResError(
            context,
            new errors.UserNotAuthenticatedError(
                'Unable to authenticate user.',
                401
            )
        );
        return Promise.reject();
    }
    return request.post(`${process.env.USER_API_URL}/api/v1/changepass/${req.params.id}`, {
        json: true,
        body: req.body,
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
