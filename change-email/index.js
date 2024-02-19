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

    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(String(req.body.email).toLowerCase()) || req.body.email.length > 200) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide email address',
                400
            )
        );
        return Promise.resolve();
    }
    
    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${req.params.id}`, {
        json: true,
        body: { email: req.body.email },
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
