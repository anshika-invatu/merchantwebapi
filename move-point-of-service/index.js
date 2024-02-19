'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//BASE-508
module.exports = async (context, req) => {
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to move a point-of-service but the request body seems to be empty. Kindly specify the request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    
    if (!req.body.pointOfServiceID || !req.body.moveToMerchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide the point of service id and moveToMerchantID',
                400
            )
        );
        return Promise.reject();
    }
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
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isOneValidMerchant = false, isSecondValidMerchant = false;
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.moveToMerchantID && element.roles === 'admin')
                    isOneValidMerchant = true;
            });
            user.merchants.forEach(element => {
                if (element.merchantID === req.params.id && element.roles === 'admin')
                    isSecondValidMerchant = true;
            });
        }
        if (!isOneValidMerchant || !isSecondValidMerchant) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
            return Promise.resolve();
        }
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${req.params.id}/move-point-of-service`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: req.body
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
