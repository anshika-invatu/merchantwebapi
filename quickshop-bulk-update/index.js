'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
    
    var token = await utils.decodeToken(req.headers.authorization);

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
                'You\'ve requested to quickshop bulk update but the request body seems to be empty. Kindly pass request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    if (!req.body.quickShops) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide quickShop in request body.',
                400
            )
        );
        return Promise.resolve();
    }
    try {
           
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isMerchantLinked = false;
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.merchantID && element.roles === 'admin') {
                    isMerchantLinked = true;
                }
            });
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantId not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
        const result = await request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/pos-bulk-update`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        context.log(result);
        context.res = {
            body: result
        };
    } catch (error) {
        await utils.handleError(context, error);
    }
};
