'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the story BASE-67 for more details

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
                    'You\'ve requested to update a new landing page but the request body seems to be empty. Kindly pass the req body.',
                    400
                )
            );
            return Promise.resolve();
        }
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const userMerchants = [];
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                userMerchants.push(element.merchantID);
            });
            
        }
        const result = await request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/landing-pages/${req.params.id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            },
            body: { userMerchants: userMerchants, updatedLandingPage: req.body }
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
