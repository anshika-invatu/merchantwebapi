'use strict';

const request = require('request-promise');
const utils = require('../utils');

module.exports = (context) => {
    const executionStart = new Date();

    return request.get(process.env.MERCHANT_API_URL + '/api/' + process.env.MERCHANT_API_VERSION + '/countries', {
        json: true,
        headers: {
            'x-functions-key': process.env.MERCHANT_API_KEY
        }
    }).then(result => {
        const logMessage = {};
        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
        logMessage.operation = 'Get';
        logMessage.result = 'Get countries call completed';
        utils.logInfo(logMessage);
        context.res = {
            body: result
        };
    })
        .catch(error => utils.handleError(context, error));
};
