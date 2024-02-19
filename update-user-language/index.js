'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');
//Please refer the bac-119 for further details
module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
    if (!utils.authenticateRequest(context, req) || token._id !== req.params.userID) {
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
                'You have requested to update user language but the request body seems to be empty. Kindly pass the languageCode and languageName fields using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }

    if (!req.body.languageName || !req.body.languageCode) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide language name and its code',
                400
            )
        );
        return Promise.resolve();
    }

    var isoFormat = /^[a-z]{2}-[A-Z]{2}$/; // for matching language code format
    if (!(req.body.languageCode.match(isoFormat))) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide language code in ISO format',
                400
            )
        );
        return Promise.resolve();
    }
    
    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${req.params.userID}`, {
        body: req.body,
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        if (result && result.code === 200) {
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.operation = 'Update';
            logMessage.result = 'Update user language call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: {
                    code: 200,
                    description: 'Successfully updated the language'
                }
            };
        }
    })
        .catch(error => utils.handleError(context, error));
};
