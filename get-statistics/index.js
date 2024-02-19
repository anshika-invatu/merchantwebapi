'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//this endpoints allow the user to get statistics data for a given Merchant ID
//Please refer the bac-142 for further details

module.exports = (context, req) => {
    const executionStart = new Date();
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
    const statistics = ['daily', 'monthly'];
    if (!req.query.statistics || statistics.indexOf(req.query.statistics) === -1) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide merchant valid statistics value like daily or monthly',
                400
            )
        );
        return Promise.reject();
    }

    let date, url;
    if (req.query.statistics === 'daily') {
        if (!req.query.month || !req.query.month.match(/^(0?[1-9]|1[012])$/)) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide valid month number to get daily statistics in query string',
                    400
                )
            );
            return Promise.reject();
        }

        if (req.query.year && !req.query.year.match(/^\d{4}$/)) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide valid year to get daily statistics',
                    400
                )
            );
            return Promise.reject();
        }

        const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
        const month = Number(req.query.month) - 1; // substract 1 as to make month number in js format
        date = new Date(Date.UTC(year, month)).toISOString();
        url = `${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.id}/daily-statistics?date=${date}`;
    }

    if (req.query.statistics === 'monthly') {

        if (!req.query.year || !req.query.year.match(/^\d{4}$/)) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide valid year to get monthly statistics',
                    400
                )
            );
            return Promise.reject();
        }

        const year = Number(req.query.year);
        date = new Date(Date.UTC(year, 0)).toISOString();
        url = `${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.id}/monthly-statistics?date=${date}`;
    }

    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) { //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.get(url, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                }).then(result => {
                    if (result) {
                        const logMessage = {};
                        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                        logMessage.operation = 'Get';
                        logMessage.result = 'Get statistics call completed successfully';
                        utils.logInfo(logMessage);
                        context.res = {
                            body: result
                        };
                    }
                })
                    .catch(error => utils.handleError(context, error));
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
        }
    });
};
