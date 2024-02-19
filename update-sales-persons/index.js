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
                'You\'ve requested to update a sales persons but the query string seems to be empty. Kindly specify the query string field',
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


    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to update a sales persons but the request body seems to be empty. Kindly specify the sales persons field to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.salesPersons) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide salesPersons field in request body',
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
                var isSalePersonExist = false;
                if (isBusinessunitAccessible) {
                    if (Array.isArray(result[0].salesPersons)) {
                        for (let i = 0; i < result[0].salesPersons.length; i++) {
                            if (result[0].salesPersons[i].salesPersonID === req.query.salesPersonID) {
                                isSalePersonExist = true;
                                result[0].salesPersons[i].salesPersonID = req.query.salesPersonID;
                                if (req.body.salesPersons.salesPersonID) {
                                    result[0].salesPersons[i].salesPersonID = req.body.salesPersons.salesPersonID;
                                }
                                if (req.body.salesPersons.salesPersonName) {
                                    result[0].salesPersons[i].salesPersonName = req.body.salesPersons.salesPersonName;
                                }
                                if (req.body.salesPersons.salesPersonCode) {
                                    result[0].salesPersons[i].salesPersonCode = req.body.salesPersons.salesPersonCode;
                                }
                                if (req.body.salesPersons.salesPersonIconUrl) {
                                    result[0].salesPersons[i].salesPersonIconUrl = req.body.salesPersons.salesPersonIconUrl;
                                }

                            }
                        }
                    }
                    if (isSalePersonExist) {
                        return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${req.query.businessunitID}`, {
                            json: true,
                            body: { salesPersons: result[0].salesPersons }, //sales persons field will be updated
                            headers: {
                                'x-functions-key': process.env.MERCHANT_API_KEY
                            }
                        });
                    } else {
                        utils.setContextResError(
                            context,
                            new errors.SalesPersonsNotFoundError(
                                'Sales person with this salesPersonID not exist',
                                404
                            )
                        );
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
                logMessage.operation = 'Update';
                logMessage.result = 'Update sales persons call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated the sales person'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
