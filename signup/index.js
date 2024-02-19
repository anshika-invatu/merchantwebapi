'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');
//Please refer the story bac-88 for more details
module.exports = (context, req) => {
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You have requested for signup but the request body seems to be empty.',
                400
            )
        );
        return Promise.resolve();
    }

    return request.post(process.env.USER_API_URL + '/api/' + process.env.USER_API_VERSION + '/signup', {
        body: req.body,
        json: true,
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
