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

    try {
        
        const result = await request.get(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${req.params.id}/energy-management-groups/${req.params.energyManagementGroupID}`, {
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

