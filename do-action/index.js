'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');

//Please refer bac-309 for this endpoint related details


module.exports = (context, req) => {
    let pointOfService, actionName;
    let isAbleToDoAction = false;
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
    if (!req.query.pointOfServiceID || !req.query.actionCode) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide pointOfServiceId and actionCode in req url query parameter',
                400
            )
        );
        return Promise.reject();
    }
    return utils
        .validateUUIDField(context, `${req.query.pointOfServiceID}`, 'The pointOfServiceID field specified in the request url does not match the UUID v4 format.')
        .then(() => {
            var reg = '^[a-zA-Z0-9]{0,50}$';
            var res = req.query.actionCode.match(reg);
            if (res) {
                return request.get(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/point-of-service/${req.query.pointOfServiceID}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.DEVICE_API_KEY
                    }
                });
            } else {
                return Promise.reject(
                    new errors.ActionCodeFormatError(
                        'Please provide actionCode in correct format in request url',
                        400
                    )
                );
            }
        })
        .then(pointOfServiceDoc => {
            if (pointOfServiceDoc) {
                pointOfService = pointOfServiceDoc;
                return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/pos-actions`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.PRODUCT_API_KEY
                    }
                });
            }
        })
        .then(posActionDoc => {
            if (posActionDoc) {
                if (posActionDoc.actions && Array.isArray(posActionDoc.actions)) {
                    posActionDoc.actions.forEach(action => {
                        if (action.actionCode === req.query.actionCode) {
                            if (action.actionTexts && Array.isArray(action.actionTexts)) {
                                action.actionTexts.forEach(actionText => {
                                    if (actionText.languageCode === 'en-US') {
                                        actionName = actionText.actionName;
                                    }
                                });
                            }
                        }
                    });
                }
                return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
                    json: true,
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            }
        })
        .then(user => {
            if (user && user.merchants && Array.isArray(user.merchants)) {
                user.merchants.forEach(element => {
                    if (element.merchantID === pointOfService.merchantID && element.roles === 'admin') {
                        isAbleToDoAction = true;
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
                return Promise.resolve(null);
            }
            if (isAbleToDoAction) {
                const id = uuid.v4();
                const message = {
                    _id: id,
                    docType: 'doAction',
                    partitionKey: id,
                    actionCode: req.query.actionCode,
                    actionName: actionName,
                    pointOfServiceID: req.query.pointOfServiceID,
                    pointofServiceName: pointOfService.pointOfServiceName,
                    actionByUserID: user._id,
                    userName: req.body ? req.body.userName : '',
                    createdDate: new Date(),
                    updatedDate: new Date()
                };
                utils.sendMessageToAzureBus(process.env.AZURE_BUS_TOPIC_ACTION_DO, message);
                return true;
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'This user not have permision to do action',
                        401
                    )
                );
                return Promise.resolve(null);
            }
        })
        .then(result => {
            if (result) {
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully Send Message to Azure Topic'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));

};
