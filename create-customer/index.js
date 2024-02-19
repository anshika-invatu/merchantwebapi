'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//Please refer the BASE-103 for further details

module.exports = async (context, req) => {
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
                'You\'ve requested to create a customer but the request body seems to be empty. Kindly specify customer field to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    try {
        let isMerchantLinked = false;
        if (req.params.id === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
            isMerchantLinked = true;
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

        const result = await request.post(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/customers`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });

        context.res = {
            body: result
        };
    } catch (error) {
        utils.handleError(context, error);
    }
};
