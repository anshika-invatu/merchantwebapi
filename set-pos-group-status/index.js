'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-153 for this endpoint related details

module.exports = async function (context, req) {
    try {
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
                    'You\'ve requested to set a POS group status but the request body seems to be empty. Kindly specify status using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        const statusCodes = ['available', 'closed', 'maintenance', 'cleaning', 'booked', 'occupied', 'evacuate', 'fire'];
        if (!statusCodes.includes(req.body.statusCode)) {
            utils.setContextResError(
                context,
                new errors.StatusCodeNotValidError(
                    'You\'ve requested to set a POS group status with wrong statusCode.',
                    403
                )
            );
            return Promise.resolve();
        }
        await utils.validateUUIDField(context, `${req.body.posGroupID}`, 'The posGroupID field specified in the request body does not match the UUID v4 format.');

        req.body.merchantID = req.params.id;
        const result = await request.patch(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/set-pos-group-status`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: req.body
        });

        if (result) {
            context.res = {
                body: {
                    code: 200,
                    description: 'Successfully set pos group status.'
                }
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};