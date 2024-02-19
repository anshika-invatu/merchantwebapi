'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');

module.exports = (context, req) => {
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You have requested to authenticate a user but the request body seems to be empty. Kindly pass the user to be authenticated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    return request.post(process.env.USER_API_URL + '/api/v1/login', {
        body: {
            email: req.body.email,
            password: req.body.password
        },
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(token => {
        const logMessage = {};
        logMessage.operation = 'Login';
        logMessage.result = 'Successfully login';
        utils.logInfo(logMessage);
        context.res = {
            body: token
        };
    })
        .catch(error => utils.handleError(context, error));
};
