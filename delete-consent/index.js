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

    if (!req.query) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'You\'ve requested to delete a consents but the query string seems to be empty. Kindly specify the query string field',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.query.consentKey) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide consentKey field in query string',
                400
            )
        );
        return Promise.reject();
    }

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        let isConsentExist = false;
        const consentArray = [];
        if (user && Array.isArray(user.consents)) {
            user.consents.forEach(element => {
                if (element.consentKey === req.query.consentKey) {
                    isConsentExist = true;
                } else {
                    consentArray.push(element);
                }
            });
        }
        if (isConsentExist) {
            return request.patch(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
                json: true,
                body: { consents: consentArray },
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.ConsentNotFoundError(
                    'Consent with this consent key not found',
                    404
                )
            );
        }
    })
        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Delete';
                logMessage.result = 'Delete consents call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully deleted consent from user'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
