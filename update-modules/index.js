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

        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isMerchantLinked = false;
        if (user && Array.isArray(user.merchants) && user.merchants.length) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.params.id) {
                    isMerchantLinked = true;
                }
            });
        }
        if (isMerchantLinked) {
            const result = await request.patch(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchants/${req.params.id}/modules/${req.params.moduleID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.DEVICE_API_KEY
                },
                body: req.body
            });

            if (result) {
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated the document'
                    }
                };
            }
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
    } catch (error) {
        utils.handleError(context, error);
    }
};