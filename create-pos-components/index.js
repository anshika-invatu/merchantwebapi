'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the story BASE-45 for more details

module.exports = async (context, req) => {
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
                    'You\'ve requested to create a component but the request body seems to be empty. Kindly specify the components field to be created using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        let isMerchantLinked = false;
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const pointOfService = await request.get(`${process.env.DEVICE_API_URL}/api/v1/point-of-service/${req.body.pointOfServiceID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        if (user && Array.isArray(user.merchants) && user.merchants.length && pointOfService && pointOfService.merchantID) {
            user.merchants.forEach(element => {
                if (element.merchantID === pointOfService.merchantID) {
                    isMerchantLinked = true;
                }
            });
        }
        let result;
        if (isMerchantLinked) {
            result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/pos-components`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.DEVICE_API_KEY
                },
                body: req.body
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Merchants not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
        if (result) {
            context.res = {
                body: result
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
