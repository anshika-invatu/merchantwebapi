'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//BASE-483

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

    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a new energy-managment-group but the request body seems to be empty. Kindly pass the request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }

    try {
        if (!req.body.adminRights)
            req.body.adminRights = [];
        req.body.adminRights.push({
            merchantID: req.params.id,
            roles: 'admin'
        });
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/energy-management-groups`, {
            body: req.body,
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });

        context.res = {
            body: result
        };
        
    } catch (error) {
        utils.handleError(context, error);
    }
};

