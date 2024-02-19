'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a validation code but the request body seems to be empty. Kindly pass the userID and event for creating a validation code',
                400
            )
        );
        return Promise.resolve();
    }
    const token = utils.decodeToken(req.headers.authorization);

    if (!utils.authenticateRequest(context, req) || token._id !== req.body.userID) {
        utils.setContextResError(
            context,
            new errors.UserNotAuthenticatedError(
                'Unable to authenticate user.',
                401
            )
        );
        return Promise.reject();
    }

    return request.post(`${process.env.USER_API_URL}/api/v1/request-verification-code`, {
        json: true,
        body: { _id: req.body.userID, action: req.body.action },
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
