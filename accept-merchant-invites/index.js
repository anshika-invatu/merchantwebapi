'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');

//Please refer the bac-130,400 for further details

module.exports = (context, req) => {
    
    const executionStart = new Date();
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


    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    })
        .then(user => {
            if (user && user.merchantInvites && Array.isArray(user.merchantInvites)) {
                const merchantArray = [];
                let merchant;
                user.merchantInvites.forEach(element => {
                    if (element.merchantID === req.params.merchantID) {
                        merchant = element;
                        
                    } else {
                        merchantArray.push(element);
                    }
                });
                if (user.merchantInvites.length === merchantArray.length) {
                    utils.setContextResError(
                        context,
                        new errors.MerchantNotFoundError(
                            'The Merchant not exist in merchantInvites',
                            404
                        )
                    );
                } else if (merchant) {
                    const movedMerchant = {
                        merchantID: merchant.merchantID,
                        merchantName: merchant.merchantName,
                        userGroups: '',
                        roles: '',
                    };
                    if (user.merchants && Array.isArray(user.merchants)) {
                        user.merchants.push(movedMerchant);
                    } else {
                        user.merchants = new Array(movedMerchant);
                    }
                    return request.patch(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, {
                        body: {
                            merchantInvites: merchantArray,
                            merchants: user.merchants
                        },
                        json: true,
                        headers: {
                            'x-functions-key': process.env.USER_API_KEY
                        }
                    });

                }
            }
        })
        .then(result => {
            if (result && result.code === 200) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Moved merchant call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully moved merchant from merchantInvites to merchants section of user'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
