'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the bac-132 for further details

module.exports = (context, req) => {
    const executionStart = new Date();
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

    let isMerchantExist = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                if (req.params.merchantID === element.merchantID) {
                    isMerchantExist = true;
                }
            });
        }
        if (isMerchantExist) { // get users by merchantID api call
            return request.get(`${process.env.USER_API_URL}/api/v1/merchants/${req.params.merchantID}/users`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
        }

    }).
        then(users => {
            const usersArray = [];
            if (users && Array.isArray(users) && users.length) {
                users.forEach(element => {
                    const merchant = element.merchants.filter(x => x.merchantID === req.params.merchantID);
                    const userDetails = {
                        _id: element._id,
                        email: element.email,
                        name: element.name,
                        isEnabled: element.isEnabled,
                        isLocked: element.isLocked,
                        lastLoginDate: element.lastLoginDate,
                        roles: merchant[0].roles
                    };
                    usersArray.push(userDetails);
                });
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Get';
                logMessage.result = 'Get team call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        users: usersArray
                    }
                };

            }
        })
        .catch(error => utils.handleError(context, error));

};
