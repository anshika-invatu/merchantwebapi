'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer bac-40 for this endpoint related details

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
                    'You\'ve requested to update a POS status but the request body seems to be empty. Kindly specify status using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }

        if (req.body.status === undefined) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide status in req body',
                    403
                )
            );
            return Promise.reject();
        }

        await utils.validateUUIDField(context, `${req.params.pointOfServiceID}`, 'The pointOfServiceID field specified in the request url does not match the UUID v4 format.');

        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        const result = await request.patch(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/set-pos-open-for-sale-status/${req.params.pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: {
                userID: user._id,
                status: req.body.status
            }
        });

        if (result) {
            context.res = {
                body: {
                    code: 200,
                    description: 'Successfully set pos status open/close for sale.'
                }
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};