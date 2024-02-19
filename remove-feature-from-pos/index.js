'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the story BASE-73 for more details

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
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const pointOfService = await request.get(`${process.env.DEVICE_API_URL}/api/v1/point-of-service/${req.params.id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        let isMerchantLinked = false, merchantID;
        if (user && user.merchants && Array.isArray(user.merchants)) {
            for (var i = 0, len = user.merchants.length; i < len; i++) {
                if (user.merchants[i].merchantID === pointOfService.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                    isMerchantLinked = true;
                    merchantID = pointOfService.merchantID;
                }
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Issuer merchantID not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
        const result = await request.delete(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/point-of-service/${req.params.id}/update-feature-to-pos/${req.params.featureID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            },
            body: { merchantID: merchantID, pointOfService: pointOfService }
        });
       
        if (result) {
            context.res = {
                body: result
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }

};
