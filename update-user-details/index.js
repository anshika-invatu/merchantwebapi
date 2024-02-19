'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    const executionStart = new Date();
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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You have requested to update user details but the request body seems to be empty. Kindly pass the mobilePhone and country fields using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }

    if (!req.body.mobilePhone && !req.body.country) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide user mobilePhone and its country',
                400
            )
        );
        return Promise.resolve();
    }

    if (req.body.country && !(req.body.country.match(/^[A-Z]{2}$/))) { // regex for country field to have values like 'SE'
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide valid country in two capital letters like \'SE\'',
                400
            )
        );
        return Promise.resolve();
    }
    const userDetails = {};
    if (req.body.country) {
        userDetails.country = req.body.country;
    }
    if (req.body.mobilePhone) {
        userDetails.mobilePhone = req.body.mobilePhone;
    }
    
    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${req.params.id}`, {
        json: true,
        body: userDetails,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        if (result && result.code === 200) {
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.operation = 'Update';
            logMessage.result = 'Update user details call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: {
                    code: 200,
                    description: 'Successfully updated the user details'
                }
            };
        }

    })
        .catch(error => utils.handleError(context, error));
};
