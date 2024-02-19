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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a sales persons but the request body seems to be empty. Kindly specify the sales persons field to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.salesPersons || !req.body.salesPersons.salesPersonID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide salesPersons field with salesPersonID in request body',
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
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${req.params.businessunitID}`, {
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
                    let salesPersonsArray, salesPersonIDs = [];
                    if (Array.isArray(req.body.salesPersons)) {
                        salesPersonsArray = new Array(...req.body.salesPersons);
                    } else {
                        salesPersonsArray = new Array(req.body.salesPersons);
                    }

                    if (Array.isArray(result[0].salesPersons)) {
                        salesPersonIDs = result[0].salesPersons.map(x => x.salesPersonID);
                        result[0].salesPersons.push(...salesPersonsArray);
                    } else {
                        result[0].salesPersons = new Array(...salesPersonsArray);
                    }
                    if (salesPersonIDs.indexOf(req.body.salesPersons.salesPersonID) === -1) {
                        return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${req.params.businessunitID}`, {
                            json: true,
                            body: { salesPersons: result[0].salesPersons }, //salesPersons field will be created
                            headers: {
                                'x-functions-key': process.env.MERCHANT_API_KEY
                            }
                        });
                    } else {
                        utils.setContextResError(
                            context,
                            new errors.SalesPersonsAlreadyExistError(
                                'Sales person with this salesPersonID already exist',
                                403
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
                logMessage.operation = 'Create';
                logMessage.result = 'Create sales persons call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: req.body.salesPersons // returns sales persons which is created
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
