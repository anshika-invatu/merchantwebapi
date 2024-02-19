'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
//Please refer the bac-103,353 for further details
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
                'You\'ve requested to add products in a webshop but the request body seems to be empty. Kindly specify the product properties to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.productID && !req.body.merchantID && !req.body.webshopID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please provide productID and merchantID, merchantID and webshopID in the req body.',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        let isMerchantLinked = false, result;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        
        if (user && user.merchants && Array.isArray(user.merchants)) {
            for (var i = 0, len = user.merchants.length; i < len; i++) {
                if (user.merchants[i].merchantID === req.body.merchantID && user.merchants[i].roles === 'admin') {   //Validate whether user is allowed to see merchant data or not?
                    isMerchantLinked = true;
                }
            }
        }
        if (isMerchantLinked) {
          
            result = await request.post(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/add-products-in-webshop`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                },
                body: req.body
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Issuer merchantID not linked to this user.',
                    401
                )
            );
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
