'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');

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

        if (!req.body || (!req.body.merchantID && !req.body.integrationID)) {
            utils.setContextResError(
                context,
                new errors.FieldValidationError(
                    'Please send MerchantID and integrationID in req body.',
                    400
                )
            );
            return Promise.resolve();
        }


        let isMerchantLinked = false;
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        const userMerchants = [];
        if (user && user.merchants && Array.isArray(user.merchants)) {
            user.merchants.forEach(element => {
                userMerchants.push(element.merchantID);
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
        if (!req.body.adminRights) {
            req.body.adminRights = new Array();
        }

        const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.body.merchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });

        const integration = await request.get(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/integration/${req.body.integrationID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.EVENTS_PROCESSOR_API_KEY
            },
            body: { userMerchants: userMerchants }
        });

        req.body._id = uuid.v4();
        req.body.merchantName = merchant.merchantName;
        req.body.token = uuid.v4();
        req.body.docType = 'ocpiCredentials';
        req.body.integrationName = integration.integrationName;
        req.body.url = 'https://api.vourity.com/ocpi/onboarding/versions';
        req.body.tokenType = 'A';
        req.body.roles = [
            {
                'role': 'EMSP',
                'party_id': 'VOR',
                'country_code': 'SE',
                'business_details': {
                    'name': 'Vourity AB'
                }
            }
        ];

        req.body.adminRights.push({
            merchantID: req.body.merchantID,
            merchantName: merchant.merchantName,
            roles: 'admin'
        });


        const result = await request.post(`${process.env.EVENTS_PROCESSOR_API_URL}/api/${process.env.EVENTS_PROCESSOR_API_VERSION}/ocpi-credential`, {
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
