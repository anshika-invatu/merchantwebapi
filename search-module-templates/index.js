'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the story BASE-47 for more details

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
        if (!req.query.name) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please provide the name in req query parameter.',
                    403
                )
            );
            return Promise.resolve();
        }
        const userMerchants = [];
        const token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        if (user && Array.isArray(user.merchants) && user.merchants.length) {
            user.merchants.forEach(element => {
                userMerchants.push(element.merchantID);
            });
        }
        const languageCode = user.languageCode;
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/search-module-template?${context.req.originalUrl.split('?')[1]}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            },
            body: { userMerchants: userMerchants, languageCode: languageCode }
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
