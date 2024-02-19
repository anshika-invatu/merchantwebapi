'use strict';

const utils = require('../utils');
const request = require('request-promise');

//Please refer bac-198 for this endpoint related details

module.exports = (context, req) => {
    const executionStart = new Date();
    return request.post(`${process.env.USER_API_URL}/api/v1/forgotten-password-confirm`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        },
        body: req.body
    }).then(result => {
        if (result) {
            const logMessage = {};
            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
            logMessage.code = 200;
            logMessage.result = 'Forgotten Password Confirm call completed successfully';
            utils.logInfo(logMessage);
            context.res = {
                body: result
            };
        }
    })
        .catch(error => utils.handleError(context, error));
};
