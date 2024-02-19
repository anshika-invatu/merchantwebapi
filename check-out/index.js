'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');


//Please refer the BASE-313 for further details

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
                'You\'ve requested to create a new access-log but the request body seems to be empty. Kindly pass the access-log to be created using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }
    
    if (!req.body.merchantID) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please send merchantID in req body.',
                401
            )
        );
        return Promise.resolve();
    }

    try {
        let isMerchantLinked = false, booking;
        if (req.body.bookingID)
            booking = await request.get(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/bookings/${req.body.bookingID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.CUSTOMER_API_KEY
                }
            });
        if (req.body.bookingToken)
            booking = await request.get(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/booking-by-token/${req.body.bookingToken}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.CUSTOMER_API_KEY
                }
            });
        if (!booking) {
            utils.setContextResError(
                context,
                new errors.BookingNotFoundError(
                    'The booking details specified doesn\'t exist.',
                    404
                )
            );
            return Promise.resolve();
        }
        if (booking && booking.merchantID === req.body.merchantID) {
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

        const result = await request.post(`${process.env.CUSTOMER_API_URL}/api/${process.env.CUSTOMER_API_VERSION}/check-out`, {
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