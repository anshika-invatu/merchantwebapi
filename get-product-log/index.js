'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//Please refer the BASE-561 for further details
module.exports = async (context, req) => {

    try {

        var token = utils.decodeToken(req.headers.authorization);
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
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User by userID
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isMerchantLinked = false;
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.params.id) {
                isMerchantLinked = true;
            }
        }
        let productLog;
        if (isMerchantLinked) {
            productLog = await request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/merchants/${req.params.id}/product-log/${req.params.productID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to this user.',
                    401
                )
            );
        }

        if (productLog) {
            context.res = {
                body: productLog
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
