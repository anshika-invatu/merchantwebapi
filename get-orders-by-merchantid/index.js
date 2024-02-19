'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const moment = require('moment');

//Please refer the bac-157 for further details

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
    let url;
    if (req.query.webShopID) {
        url = `${process.env.ORDER_API_URL}/api/v1/merchants/${req.params.id}/orders?webShopID=${req.query.webShopID}`;
    } else {
        url = `${process.env.ORDER_API_URL}/api/v1/merchants/${req.params.id}/orders`;
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
                return request.get(url, { // order api call to get orders
                    json: true,
                    headers: {
                        'x-functions-key': process.env.ORDER_API_KEY
                    }
                }).then(orders => {
                    if (Array.isArray(orders) && orders.length) {
                        const orderArray = [];
                        if (req.query.fromDate && req.query.toDate) {
                            const fromDate = moment.utc(req.query.fromDate);
                            const toDate = moment.utc(req.query.toDate);
                            orders.forEach(element => {
                                if (element.orderDate) {
                                    const orderDate = moment.utc(element.orderDate).startOf('day');
                                    if (orderDate >= fromDate && orderDate <= toDate) {
                                        orderArray.push(element);
                                    }
                                }

                            });
                            if (orderArray.length > 1) {
                                orderArray.sort((a, b) => {
                                    return new Date(b.orderDate) - new Date(a.orderDate);
                                });
                            }
                        } else {
                            orders.sort((a, b) => {
                                return new Date(b.orderDate) - new Date(a.orderDate);
                            });
                            if (orders.length > 20) {
                                for (let i = 0; i < 20; i++) {
                                    orderArray.push(orders[i]);
                                }
                            } else {
                                orderArray.push(...orders);
                            }

                        }
                        const logMessage = {};
                        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                        logMessage.operation = 'Get';
                        logMessage.result = 'Get orders call completed successfully';
                        utils.logInfo(logMessage);
                        context.res = {
                            body: orderArray
                        };

                    } else {
                        const logMessage = {};
                        logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                        logMessage.operation = 'Get';
                        logMessage.result = 'Get orders call completed successfully';
                        utils.logInfo(logMessage);
                        context.res = {
                            body: []
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
