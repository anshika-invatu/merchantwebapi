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
                'You\'ve requested to update a consents but the request body seems to be empty. Kindly specify consents field to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.consents) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide consents field in request body',
                400
            )
        );
        return Promise.reject();
    }

    if (!req.query) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'You\'ve requested to update a consents but the query string seems to be empty. Kindly specify the query string field',
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
        if (user && Array.isArray(user.consents)) {
            for (let i = 0; i < user.consents.length; i++) {
                if (user.consents[i].consentKey === req.query.consentKey) {
                    isConsentExist = true;
                    if (req.body.consents.consentKey) {
                        user.consents[i].consentKey = req.body.consents.consentKey;
                    }
                    if (req.body.consents.consentName) {
                        user.consents[i].consentName = req.body.consents.consentName;
                    }
                    if (req.body.consents.documentVersion) {
                        user.consents[i].documentVersion = req.body.consents.documentVersion;
                    }
                    if (req.body.consents.documentURL) {
                        user.consents[i].documentURL = req.body.consents.documentURL;
                    }
                    if (req.body.consents.approvalDate) {
                        user.consents[i].approvalDate = new Date(req.body.consents.approvalDate);
                    }
                    if (req.body.consents.hasOwnProperty('isApproved')) {
                        user.consents[i].isApproved = req.body.consents.isApproved;
                    }
                }
            }
        }
        if (isConsentExist) {
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
                logMessage.operation = 'Update';
                logMessage.result = 'Update consents call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated consent from user'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
