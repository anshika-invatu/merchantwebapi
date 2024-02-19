'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-215 for this endpoint related details

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

    if (!req.body && typeof(req.body) === 'object') {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'Empty body or bad format.',
                400
            )
        );
        return Promise.reject();
    }

    return request.post(`${process.env.GETSWISH}` + '/qrg-swish/api/v1/prefilled', {
        body: req.body,
        json: true,
        encoding: null
    })
        .then(result => {
            context.res = {
                body: result,
                isRaw: true,
                status: 200
            };
        })
        .catch(error => {
            utils.handleError(context, error);
        });
};