'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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
                    'You\'ve requested to start-pos-session but the request body seems to be empty. Kindly pass the start-pos-session to be created using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }

        if (!req.body.merchantID || !req.body.componentID || !req.body.pointOfServiceID || !req.body.salesChannelName || !req.body.salesChannelTypeCode || !req.body.salesChannelID) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'merchantID, componentID, pointOfServiceID, salesChannelName, salesChannelTypeCode, salesChannelID are required in req body.',
                    400
                )
            );
            return Promise.resolve();
        }

        context.log('Request body = ' + JSON.stringify(req.body));
        let isMerchantLinked = false;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.merchantID) { //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
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

        req.body.sessionType = 'evcharging';
        req.body.commandType = 'manualStart';

        const result = await request.post(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/start-pos-session`, {
            json: true,
            headers: {
                'x-functions-key': process.env.ORDER_API_KEY
            },
            body: req.body
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        console.log(error);
        utils.handleError(context, error);
    }
};