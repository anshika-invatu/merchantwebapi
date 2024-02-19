'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//Please refer the BASE-283 for further details
module.exports = async (context, req) => {
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
    if (!req.body) {
        utils.setContextResError(
            context,
            new errors.EmptyRequestBodyError(
                'You\'ve requested to create a new quickshop but the request body seems to be empty. Kindly pass the quickshop to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        let merchantName;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        
        user.merchants.forEach(element => {
            if (element.merchantID === req.body.merchantID) {
                merchantName = element.merchantName;
            }
        });
        
        if (!req.body.adminRights)
            req.body.adminRights = [];
        req.body.adminRights.push({
            merchantID: req.body.merchantID,
            merchantName: merchantName,
            roles: 'admin'
        });
        const result = await request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/quickshop`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
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
