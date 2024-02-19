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
    if (!req.body || !req.body.pointOfServiceID || !req.body.smartChargingProfileID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide pointOfServiceID and smartChargingProfileID in req body',
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
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
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
        const result = await request.post(`${process.env.OCPP16_API_URL}/api/${process.env.OCPP16_API_VERSION}/set-charging-profile`, {
            json: true,
            headers: {
                'x-functions-key': process.env.OCPP16_API_KEY
            },
            body: req.body
        });
        context.res = {
            body: result
        };

    } catch (error) {
        utils.handleError(context, error);
    }
};
