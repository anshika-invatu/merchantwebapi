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
        const user = await request.get(`${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });

        const result = await request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products-types?languageCode=${user.languageCode}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.PRODUCT_API_KEY
            }
        });
        context.res = {
            body: result
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};

