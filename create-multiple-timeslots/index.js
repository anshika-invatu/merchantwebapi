'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer BASE-289 for this endpoint related details

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

        if (!req.body && !Array.isArray(req.body)) {
            utils.setContextResError(
                context,
                new errors.EmptyRequestBodyError(
                    'You\'ve requested to create a new timeslots but the request body seems to be empty or not in array. Kindly pass the timeslots to be created using request body in application/json format',
                    400
                )
            );
            return Promise.resolve();
        }
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        const userMerchants = user.merchants.map(x => x.merchantID);
        const linkedTimeSlots = [];
        req.body.forEach(timeSlot => {
            if (userMerchants.includes(timeSlot.merchantID))
                linkedTimeSlots.push(timeSlot);
        });
        
        if (linkedTimeSlots.length < 1) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
            return Promise.resolve();
        }

        const result = await request.post(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/multiple-timeslots`, {
            body: linkedTimeSlots,
            json: true,
            headers: {
                'x-functions-key': process.env.CUSTOMER_API_KEY
            }
        });

        context.res = {
            body: result
        };
        return Promise.resolve();

    } catch (error) {
        utils.handleError(context, error);
    }
};
