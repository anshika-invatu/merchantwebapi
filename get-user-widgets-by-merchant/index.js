'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the BASE-16 for further details

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

        let isAbleToAccess = false;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        if (user && Array.isArray(user.merchants) && user._id === req.params.userID) {
            user.merchants.forEach(element => {
                if (req.params.id === element.merchantID) {
                    isAbleToAccess = true;
                }
            });
        }
        let userWidgets;
        if (isAbleToAccess) {
            const url = `${process.env.USER_API_URL}/api/v1/merchants/${req.params.id}/user-widgets/${req.params.userID}?` + context.req.originalUrl.split('?')[1];
            userWidgets = await request.get(url, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'User is not able to get user widgets for this MerchantID and userID',
                    401
                )
            );
            return Promise.resolve();
        }

        context.res = {
            body: userWidgets
        };
    } catch (error) {
        utils.handleError(context, error);
    }

};
