'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

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
                    'You\'ve requested to create a new integrations but the request body seems to be empty. Kindly pass the integrations to be created using request body in application/json format',
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
        const userMerchants = [];
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                userMerchants.push(element.merchantID);
            });
        }

        let isAbleToCreate = false;
        if (req.body.adminRights && Array.isArray(req.body.adminRights)) {
            req.body.adminRights.forEach(element => {
                if (userMerchants.includes(element.merchantID) && element.roles && (element.roles.toUpperCase() === 'ADMIN' || element.roles.toUpperCase() === 'WRITE')) {
                    isAbleToCreate = true;
                }
            });
        }
        if (!isAbleToCreate) {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to user',
                    401
                )
            );
            return Promise.resolve();
        }
        const result = await request.post(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/integration`, {
            body: req.body,
            json: true,
            headers: {
                'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
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
