'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

// BASE-539

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
    if (!req.body || !req.body.pointOfServiceID || !req.body.availability) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide pointOfServiceID and availability in req body',
                400
            )
        );
        return Promise.reject();
    }

    if (!(req.body.availability === 'Inoperative' || req.body.availability === 'Operative')) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide Inoperative or Operative as availability in req body',
                400
            )
        );
        return Promise.reject();
    }

    try {
        await utils.validateUUIDField(context, `${req.body.pointOfServiceID}`, 'The pointOfServiceID field specified in the req body does not match the UUID v4 format.');

        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const pointOfServiceDoc = await request.get(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/point-of-service/${req.body.pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        
        let isMerchantLinked = false;

        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === pointOfServiceDoc.merchantID  && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
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
            return Promise.resolve();
        }
        if (!pointOfServiceDoc.deviceEndpoint || !pointOfServiceDoc.deviceEndpoint.protocolCode) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'PointOfService Doc have not protocolCode',
                    400
                )
            );
            return Promise.reject();
        }
        const protocolCode = pointOfServiceDoc.deviceEndpoint.protocolCode;
        if (protocolCode === 'ocpp16') {
            const result = await request.post(`${process.env.OCPP16_API_URL}/api/${process.env.OCPP16_API_VERSION}/change-availability`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.OCPP16_API_KEY
                },
                body: req.body
            });
            context.res = {
                body: result
            };
        } else if (protocolCode === 'ocpp201') {
            // TODO: link ocpp201 api change-availability endpoint
            context.res = {
                body: {
                    code: 200,
                    description: 'Successfully Send change-availability request'
                }
            };
        } else {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'PointOfService Doc have not ocpp16 or ocpp201 as protocolCode',
                    400
                )
            );
            return Promise.reject();
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
