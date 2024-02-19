'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

module.exports = async (context, req) => {
    //BASE-67
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
                    'You\'ve requested to create a new landing page but the request body seems to be empty. Kindly pass the req body.',
                    400
                )
            );
            return Promise.resolve();
        }
        
        if (!req.body.merchantID) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please send MerchantID in req body.',
                    401
                )
            );
            return Promise.resolve();
        }


        let isMerchantLinked = false, merchantName;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
                merchantName = user.merchants[i].merchantName;
            }
        }
        if (!isMerchantLinked) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
            return Promise.resolve();
        }
        if (!req.body.adminRights)
            req.body.adminRights = new Array();
        req.body.adminRights.push({
            merchantID: req.body.merchantID,
            merchantName: merchantName,
            roles: 'admin'
        });
        const result = await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/landing-pages`, {
            body: req.body,
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
