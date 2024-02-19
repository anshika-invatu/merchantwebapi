'use strict';

const utils = require('../utils');
const request = require('request-promise');

module.exports = (context, req) => {
    return request.post(`${process.env.USER_API_URL}/api/v1/forgot-pass`, {
        json: true,
        body: req.body,
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
