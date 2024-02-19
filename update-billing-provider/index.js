'use strict';

const utils = require('../utils');
const Promise = require('bluebird');
const errors = require('../errors');
const request = require('request-promise');

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
                'You\'ve requested to update a merchant-billing but the request body seems to be empty. Kindly specify the merchant-billing properties to be updated using request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    let billingProvider, customerData;
    const reqBody = {};
    try {
        await utils.validateUUIDField(context, req.params.merchantID, 'The merchant id specified in the URL does not match the UUID v4 format.');
        const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/v1/merchants/${req.params.merchantID}`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        const merchantBilling = await request.get(process.env.MERCHANT_API_URL + `/api/v1/merchants/${req.params.merchantID}/merchant-billing`, {
            json: true,
            headers: {
                'x-functions-key': process.env.MERCHANT_API_KEY
            }
        });
        if (merchantBilling) {
            reqBody.merchantBillingID = merchantBilling._id;
            if (merchantBilling.billingProviders && Array.isArray(merchantBilling.billingProviders)) {
                billingProvider = merchantBilling.billingProviders.find(o => o.name === req.body.billingProvider.toLowerCase());
                if (billingProvider)
                    reqBody.currentBillingOption = billingProvider.name;
            }
            
            if (!billingProvider) {
                if (req.body.billingProvider.toLowerCase() === 'stripe') {
                    customerData = await utils.createStripeCustomer(merchant.email);
                    reqBody.pspAccount = customerData.id;
                    reqBody.currentBillingOption = req.body.billingProvider;
                } else if (req.body.billingProvider.toLowerCase() === 'fortnox') {
                    context.log('creating customer by fortnox api');
                    customerData = await utils.createFortnoxCustomer(merchant);
                    context.log('creatated customer by fortnox api');
                    context.log(customerData);
                    if (customerData) {
                        context.log(customerData);
                        reqBody.customerID = customerData.Customer.CustomerNumber;
                        reqBody.currentBillingOption = req.body.billingProvider;
                    }
                }
            }

            const result = await request.patch(process.env.MERCHANT_API_URL + `/api/v1/merchant-billing/${req.params.merchantID}`, {
                json: true,
                body: reqBody,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
            if (result) {
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated the document'
                    }
                };
            }
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
