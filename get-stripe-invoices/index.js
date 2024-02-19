'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const moment = require('moment');

//this endpoint get the invoice from the stripe portal.
//Please refer the bac-158 for further details

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
    if (req.query.fromDate && req.query.toDate) {
        var dateBefore2Years = moment().subtract(2, 'years');
        if (dateBefore2Years > moment(req.query.fromDate)) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please dont provide daterange of more than 2 yrs before from now',
                    400
                )
            );
            return Promise.resolve();
        }
    }

    const date = {};
    if (req.query.fromDate && req.query.toDate) {
        date.gte = Math.round((new Date(req.query.fromDate)).getTime() / 1000); //for Integer Unix timestamp
        const userToDate = moment(req.query.toDate, 'YYYY-MM-DD').add(23, 'hours')
            .add(59, 'minutes')
            .format('YYYY-MM-DDTHH:mm');
        date.lte = Math.round((new Date(userToDate)).getTime() / 1000);
    } else {
        const beforeSixMonth = moment().subtract(6, 'months')
            .format('YYYY-MM-DD');
        date.gte = Math.round((new Date(beforeSixMonth)).getTime() / 1000); //for Integer Unix timestamp
        date.lte = Math.round((new Date()).getTime() / 1000);
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
                return request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.id}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                }).then(merchant => {
                    if (merchant) {
                        if (req.query.customerID && req.query.customerID !== merchant.pspAccount) {
                            utils.setContextResError(
                                context,
                                new errors.UserNotAuthenticatedError(
                                    'CustomerId not belongs to this merchant',
                                    401
                                )
                            );
                            return false;
                        } else {
                            const searchCriteria = {};
                            searchCriteria.customer = merchant.pspAccount;
                            searchCriteria.created = date;
                            return utils.getInvoiceList(searchCriteria);
                        }
                    }
                }).
                    then(result => {
                        if (result && !result.data && result.match(/No such customer:/)) {
                            utils.setContextResError(
                                context,
                                new errors.InvoiceNotFoundError(
                                    'This Merchant not registered on stripe',
                                    404
                                )
                            );

                        } else if (result && result.data) {
                            const logMessage = {};
                            logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                            logMessage.operation = 'Get';
                            logMessage.result = 'Get invoice list call completed successfully';
                            utils.logInfo(logMessage);
                            context.res = {
                                body: result.data
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
