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
    if (!req.body || !req.body.merchantID || !req.body.pointOfServiceID || !req.body.mobilePhone) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please send the required parameters(pointOfServiceID, mobilePhone and merchantID).',
                403
            )
        );
        return Promise.resolve();
    }
    try {
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/send-pos-linking-code`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
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


