'use strict';

const request = require('request-promise');
const utils = require('../utils');
const errors = require('../errors');

//Please refer bac-299 for this endpoint related details

module.exports = (context, req) => {

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

    let isUserAuthenticated = false;
    const token = utils.decodeToken(req.headers.authorization);
    const url = `${process.env.USER_API_URL}/api/${process.env.USER_API_VERSION}/users/${token._id}`;
    return request.get(url, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user) {
            const merchants = user.merchants;
            const requests = new Array();
            merchants.forEach(element => {
                if (req.body.merchantID === element.merchantID && (element.roles === 'admin')) {
                    isUserAuthenticated = true;
                    const url = `${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.body.merchantID}`;
                    const merchantRequests = request.get(url, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                    const deviceUrl = `${process.env.DEVICE_API_URL}/api/v1/merchants/${req.body.merchantID}/point-of-services`;
                    const deviceRequests = request.get(deviceUrl, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.DEVICE_API_KEY
                        }
                    });
                    requests.push(merchantRequests, deviceRequests);

                }
            });
            if (isUserAuthenticated) {
                return Promise.all(requests);

            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'Log in user not allowed to access this merchant.',
                        401
                    )
                );
            }
        }
    })
        .then(result => {
            if (result) {
                let count = 0;
                if (result[0] && result[0].isEnabled) {
                    count++;
                }
                if (result[1]) {
                    result[1].forEach(element => {
                        if (element._id === req.body.pointOfServiceID && element.isEnabled) {
                            count++;
                        }
                    });
                }
                if (count === 2) {
                    req.body.userID = token._id;
                    const deviceUrl = `${process.env.DEVICE_API_URL}/api/v1/unlink-pos`;
                    return request.post(deviceUrl, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.DEVICE_API_KEY
                        },
                        body: req.body
                    });

                } else {
                    utils.setContextResError(
                        context,
                        new errors.NotEnabledError(
                            'This Merchant or PointOfService not Enabled',
                            401
                        )
                    );
                }
            }
        })
        .then(response => {
            if (response) {
                context.res = {
                    body: response
                };
            }
        }
        )
        .catch(error => utils.handleError(context, error));
};
