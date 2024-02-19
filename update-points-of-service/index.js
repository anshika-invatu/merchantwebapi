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
                'You\'ve requested to update a point of service but the query string seems to be empty. Kindly specify the query string field',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.query.businessunitID || !req.query.pointOfServiceID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide businessunitID and pointOfServiceID field in query string',
                400
            )
        );
        return Promise.reject();
    }

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to update a points of service but the request body seems to be empty. Kindly specify the points of service field to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.pointOfService) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide pointOfService field in request body',
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
                var isPointOfServiceExist = false;
                if (isBusinessunitAccessible) {
                    if (Array.isArray(result[0].pointOfService)) {
                        for (let i = 0; i < result[0].pointOfService.length; i++) {
                            if (result[0].pointOfService[i].pointOfServiceID === req.query.pointOfServiceID) {
                                isPointOfServiceExist = true;
                                result[0].pointOfService[i].pointOfServiceID = req.query.pointOfServiceID;
                                if (req.body.pointOfService.pointOfServiceID) {
                                    result[0].pointOfService[i].pointOfServiceID = req.body.pointOfService.pointOfServiceID;
                                }
                                if (req.body.pointOfService.pointOfServiceName) {
                                    result[0].pointOfService[i].pointOfServiceName = req.body.pointOfService.pointOfServiceName;
                                }
                                if (req.body.pointOfService.pointOfServiceDescription) {
                                    result[0].pointOfService[i].pointOfServiceDescription = req.body.pointOfService.pointOfServiceDescription;
                                }
                                if (req.body.pointOfService.pointOfServiceDeviceID) {
                                    result[0].pointOfService[i].pointOfServiceDeviceID = req.body.pointOfService.pointOfServiceDeviceID;
                                }
                                if (req.body.pointOfService.location) {
                                    result[0].pointOfService[i].location = req.body.pointOfService.location;
                                }
                                if (req.body.pointOfService.latitude) {
                                    result[0].pointOfService[i].latitude = req.body.pointOfService.latitude;
                                }
                                if (req.body.pointOfService.longitude) {
                                    result[0].pointOfService[i].longitude = req.body.pointOfService.longitude;
                                }
                                if (req.body.pointOfService.hasOwnProperty('isOnline')) {
                                    result[0].pointOfService[i].isOnline = req.body.pointOfService.isOnline;
                                }
                                if (req.body.pointOfService.lastContact) {
                                    result[0].pointOfService[i].lastContact = new Date(req.body.pointOfService.lastContact);
                                }


                            }
                        }
                    }
                    if (isPointOfServiceExist) {
                        return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/business-units/${req.query.businessunitID}`, {
                            json: true,
                            body: { pointOfService: result[0].pointOfService }, //point of service field will be updated
                            headers: {
                                'x-functions-key': process.env.MERCHANT_API_KEY
                            }
                        });
                    } else {
                        utils.setContextResError(
                            context,
                            new errors.PointOfServiceNotFoundError(
                                'Point of Service with this pointOfServiceId not exist',
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
                logMessage.result = 'Update points of service call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated the points of service'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
