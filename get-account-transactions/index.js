'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const moment = require('moment');

//Please refer bac-204, 304 for this endpoint related details

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

    if (req.query.fromDate && req.query.toDate) {
        if (!moment(req.query.fromDate, 'YYYY-MM-DD', true).isValid() || !moment(req.query.toDate, 'YYYY-MM-DD', true).isValid()) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide valid daterange in format YYYY-MM-DD.',
                    400
                )
            );
            return Promise.resolve();
        }
    }
    let queryString = '';
    if (req.query.fromDate && req.query.toDate) {
        const toDate = moment(req.query.toDate, 'YYYY-MM-DD').add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds')
            .format('YYYY-MM-DDTHH:mm:ss');
        queryString += `fromDate=${req.query.fromDate}&toDate=${toDate}`;
    }

    if (req.query.accountTransactionID) {
        if (queryString) {
            queryString += `&accountTransactionID=${req.query.accountTransactionID}`;
        } else {
            queryString += `accountTransactionID=${req.query.accountTransactionID}`;
        }
    }
    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                return request.get(`${process.env.LEDGERS_API_URL}/api/v1/merchants/${req.params.id}/account-transactions?${queryString}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.LEDGERS_API_KEY
                    }
                }).then(accountTransaction => {
                    const logMessage = {};
                    logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                    logMessage.operation = 'Get';
                    logMessage.result = 'Get account transaction call completed successfully';
                    utils.logInfo(logMessage);
                    context.res = {
                        body: accountTransaction
                    };
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
