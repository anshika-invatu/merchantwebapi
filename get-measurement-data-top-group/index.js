'use strict';

const utils = require('../utils');
const errors = require('../errors');
const request = require('request-promise');

module.exports = async (context, req) => {
   
    //BASE-578
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
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        let isMerchantLinked = false;
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.params.id && (element.roles === 'admin' || element.roles === 'view')) {   //Validate whether user is allowed to see merchant data or not?
                    isMerchantLinked = true;
                }
            });
            
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
        if (!req.body)
            req.body = {};
        req.body.merchantID = req.params.id;
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/measurement-data-top-group`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
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
