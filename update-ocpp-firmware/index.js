'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
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
    if (!req.body.componentID || !req.body.firmwareURL) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'Please pass componentID, firmwareURL fields using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }
    try {
        let isMerchantLinked = false;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const componentDoc = await request.get(`${process.env.DEVICE_API_URL}/api/v1/component/${req.body.componentID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        
        const pointOfServiceID = componentDoc.pointOfServiceID;
        const pointOfServiceDoc = await request.get(`${process.env.DEVICE_API_URL}/api/v1/point-of-service/${pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        if (req.params.id !== pointOfServiceDoc.merchantID) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'User do not have access rights to perform this operation',
                    401
                )
            );
            return Promise.resolve();
        }
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'User do not have access rights to perform this operation',
                    401
                )
            );
            return Promise.resolve();
        }
        
        const protocol = pointOfServiceDoc.deviceEndpoint.protocol;
        const chargingStationID = pointOfServiceDoc.deviceEndpoint.auth.username;
        if (protocol === 'ocpp16') {
            const result = await request.post(`${process.env.OCPP16_API_URL}/api/${process.env.OCPP16_API_VERSION}/update-firmware`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.OCPP16_API_KEY
                },
                body: {
                    chargingStationID: chargingStationID,
                    pointOfServiceID: pointOfServiceID,
                    firmwareURL: req.body.firmwareURL
                }
            });
            context.res = {
                body: result
            };
        } else {
            context.res = {
                body: {
                    description: 'not implemented beside ocpp16-api'
                }
            };
        }
        
        
        
    } catch (error) {
        utils.handleError(context, error);
    }
};
