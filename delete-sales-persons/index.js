'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = (context, req) => {
    const executionStart = new Date();
    var token = utils.decodeToken(req.headers.authorization);
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

    if (!req.query) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'You\'ve requested to delete a sales persons but the query string seems to be empty. Kindly specify the query string field',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.query.businessunitID || !req.query.salesPersonID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide businessunitID and salesPersonID field in query string',
                400
            )
        );
        return Promise.reject();
    }

    let user;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(result => {
        if (result && Array.isArray(result.merchants) && result.merchants.length) {
            user = result;
            //Get business-units
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${req.query.businessunitID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'No merchants linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
    })
        .then(result => {
            if (result && result.length) {
                var isBusinessunitAccessible = false;
                if (result[0].merchantID) {
                    user.merchants.forEach(element => { // Validate if the business-units merchant id is in user merchant list.
                        if (element.merchantID === result[0].merchantID) {
                            isBusinessunitAccessible = true;
                        }
                    });
                }
                if (isBusinessunitAccessible) {

                    const salesPersonsArray = [];
                    let salesPersonIDs = [];

                    if (Array.isArray(result[0].salesPersons)) {
                        salesPersonIDs = result[0].salesPersons.map(x => x.salesPersonID);
                        result[0].salesPersons.forEach(element => { // Validate if the business-units merchant id is in user merchant list.
                            if (element.salesPersonID !== req.query.salesPersonID) {
                                salesPersonsArray.push(element);
                            }
                        });
                    }
                    if (salesPersonIDs.indexOf(req.query.salesPersonID) === -1) {
                        utils.setContextResError(
                            context,
                            new errors.SalesPersonsNotFoundError(
                                'Sales person with this salesPersonID not exist',
                                404
                            )
                        );
                    } else {
                        return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${req.query.businessunitID}`, {
                            json: true,
                            body: { salesPersons: salesPersonsArray }, //sales persons field will be deleted
                            headers: {
                                'x-functions-key': process.env.MERCHANT_API_KEY
                            }
                        });
                    }
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'Businessunit not accessible to the user',
                            401
                        )
                    );
                    return Promise.resolve();
                }
            } else {
                utils.setContextResError(
                    context,
                    new errors.BusinessUnitNotFoundError(
                        'The businessunit id specified in the URL doesn\'t exist.',
                        404
                    )
                );
            }
        })
        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Delete';
                logMessage.result = 'Delete sales persons call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully deleted the sales person'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
