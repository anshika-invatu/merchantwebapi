'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


module.exports = (context, req) => {
    var token = utils.decodeToken(req.headers.authorization);
    let userDoc;
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

    return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        if (user) {
            userDoc = user;
            return request.get(`${process.env.PRODUCT_API_URL}/api/v1/products/${req.params.id}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.PRODUCT_API_KEY
                }
            });
        }
    })
        .then(product => {
            if (product) {
                const productMerchant = userDoc.merchants.find(x => x.merchantID === product.issuer.merchantID);
                if (productMerchant) {
                    return request.post(`${process.env.PRODUCT_API_URL}/api/v1/copy-product/${req.params.id}`, {
                        json: true,
                        headers: {
                            'x-functions-key': process.env.PRODUCT_API_KEY
                        }
                    });
                } else {
                    utils.setContextResError(
                        context,
                        new errors.UserNotAuthenticatedError(
                            'Product is not linked to login user',
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
        })

        .catch(error => utils.handleError(context, error));

};
