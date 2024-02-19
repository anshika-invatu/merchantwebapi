'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-117 for further details
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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a consents but the request body seems to be empty. Kindly specify consents field to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.consents || !req.body.consents.consentKey) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide consents field with consent key in request body',
                400
            )
        );
        return Promise.reject();
    }
    let consentsArray;
    if (Array.isArray(req.body.consents)) {
        consentsArray = new Array(...req.body.consents);
    } else {
        consentsArray = new Array(req.body.consents);
    }

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            let consentKeyArray = [];
            if (Array.isArray(user.consents)) {
                consentKeyArray = user.consents.map(x => x.consentKey);
                user.consents.push(...consentsArray);
            } else {
                user.consents = new Array(...consentsArray);
            }

            if (consentKeyArray.indexOf(req.body.consents.consentKey) === -1) {
                return request.patch(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
                    json: true,
                    body: { consents: user.consents },
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.ConsentAlreadyExistError(
                        'Consent with this consent key already exist',
                        403
                    )
                );
            }
        })

        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Create';
                logMessage.result = 'Create consents call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        consents: req.body.consents
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
