'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');
//This endpoint in the Merchant Web API for setting/updating the Priceplan for the selected Merchant.
//For more details please refer story bac-86, 267, 355, 364, 410
const moment = require('moment');

module.exports = (context, req) => {
    const executionStart = new Date();
    const updateMerchant = {};
    let isMerchantAccessible = false;
    let isAlreadyNotExistMerchantPricePlan = false;
    let merchantPricePlan;
    const merchantPricePlanID = uuid.v4();
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
                'Please provide body parameters merchantID and priceplanID to update price plan in Merchant',
                400
            )
        );
        return Promise.reject();
    }

    let pricePlan, merchant;
    const userID = utils.decodeToken(req.headers.authorization)._id;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        
        if (user && Array.isArray(user.merchants) && user.merchants.length > 0) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.body.merchantID) {
                    isMerchantAccessible = true;
                }
            });
            if (isMerchantAccessible) {
                return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/priceplans?_id=${req.body.pricePlanID}`, { //Get price plan
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.UserNotAuthenticatedError(
                        'Merchant not linked to the logged in user',
                        401
                    )
                );
                return Promise.resolve();
            }
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'No merchants linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }

    })
        .then(response => {
            pricePlan = response;
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.body.merchantID}/merchant-priceplan`, { //Get merchant price plan
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        })
        .catch(error => {
            if (error && error.statusCode === 404) {
                isAlreadyNotExistMerchantPricePlan = true;
            }
        })
        .then(result =>{
            if (result) {
                merchantPricePlan = result;
                context.log('update merchant price plan for the merchantId = ' + req.body.merchantID);
            } else {
                merchantPricePlan = {};
                context.log('set new merchant price plan for the merchantId = ' + req.body.merchantID);

            }
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.body.merchantID}`, { //Get merchant
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        })
        .then(result => {
            merchant = result;
            if (merchant && merchant.vatNumber) {
                let invoiceAddress;
                if (merchant.invoiceAddress && Array.isArray(merchant.invoiceAddress) && merchant.invoiceAddress.length) {
                    invoiceAddress = merchant.invoiceAddress[0];
                }
                return utils.updateStripeCustomer(merchant.pspAccount, merchant.vatNumber, invoiceAddress, merchant.merchantName);
            }
        })
        .then(() => {
            if (pricePlan && pricePlan[0] && pricePlan[0]._id) {
                updateMerchant.pspPricePlanID = pricePlan[0].pspPricePlanID;
                if (pricePlan[0].fees) {
                    updateMerchant.feePerZeroValueVoucher = pricePlan[0].fees.feePerZeroValueVoucher;
                    updateMerchant.feeMonthlyPerBusinessUnit = pricePlan[0].fees.feeMonthlyPerBusinessUnit;
                    updateMerchant.feeMonthlyPerUser = pricePlan[0].fees.feeMonthlyPerUser;
                    updateMerchant.feeMonthlyPerPartnerNetwork = pricePlan[0].fees.feeMonthlyPerPartnerNetwork;
                    updateMerchant.feeMonthlyPerWebshop = pricePlan[0].fees.feeMonthlyPerWebshop;
                    updateMerchant.feeMonthlyPerMobilePaymentCode = pricePlan[0].fees.feeMonthlyPerMobilePaymentCode;
                }
                updateMerchant.numberOfBusinessUnitsIncluded = pricePlan[0].numberOfBusinessUnitsIncluded;
                updateMerchant.numberOfUsersIncluded = pricePlan[0].numberOfUsersIncluded;
                updateMerchant.numberOfPartnerNetworksIncluded = pricePlan[0].numberOfPartnerNetworksIncluded;
                updateMerchant.numberOfWebshopsIncluded = pricePlan[0].numberOfWebshopsIncluded;
                updateMerchant.numberOfMobilePaymentCodesIncluded = pricePlan[0].numberOfMobilePaymentCodesIncluded;

                merchantPricePlan.pricePlanName = pricePlan[0].pricePlanName;
                merchantPricePlan.pricePlanDescription = pricePlan[0].pricePlanDescription;
                merchantPricePlan.validFromDate = pricePlan[0].validFromDate;
                merchantPricePlan.validToDate = pricePlan[0].validToDate;
                merchantPricePlan.isEnabled = pricePlan[0].isEnabled;
                merchantPricePlan.isTrialPlan = pricePlan[0].isTrialPlan;
                merchantPricePlan.trialPeriodDays = pricePlan[0].trialPeriodDays;
                merchantPricePlan.nextStepPricePlan = pricePlan[0].nextStepPricePlan;
                merchantPricePlan.currency = pricePlan[0].currency;
                merchantPricePlan.country = pricePlan[0].country;
                merchantPricePlan.pricePlanCode = pricePlan[0].pricePlanCode;
                merchantPricePlan.languageCode = pricePlan[0].languageCode;
                merchantPricePlan.languageName = pricePlan[0].languageName;
                merchantPricePlan.monthlySubscriptionTransactionsCounter = pricePlan[0].monthlySubscriptionTransactionsCounter;
                merchantPricePlan.monthlySubscriptionActiveVouchersCounter = pricePlan[0].monthlySubscriptionActiveVouchersCounter;
                merchantPricePlan.fees = pricePlan[0].fees;
                merchantPricePlan.numberOfBusinessUnitsIncluded = pricePlan[0].numberOfBusinessUnitsIncluded;
                merchantPricePlan.numberOfUsersIncluded = pricePlan[0].numberOfUsersIncluded;
                merchantPricePlan.numberOfPartnerNetworksIncluded = pricePlan[0].numberOfPartnerNetworksIncluded;
                merchantPricePlan.numberOfWebshopsIncluded = pricePlan[0].numberOfWebshopsIncluded;
                merchantPricePlan.numberOfMobilePaymentCodesIncluded = pricePlan[0].numberOfMobilePaymentCodesIncluded;
                merchantPricePlan.numberOfProductsIncluded = pricePlan[0].numberOfProductsIncluded;
                merchantPricePlan.payoutForExpiredVouchersPercent = pricePlan[0].payoutForExpiredVouchersPercent;
                merchantPricePlan.vatPercent = pricePlan[0].vatPercent;
                merchantPricePlan.vatClass = pricePlan[0].vatClass;
                merchantPricePlan.pspPricePlanID = pricePlan[0].pspPricePlanID;
                merchantPricePlan.pspZeroValueVoucherPlanID = pricePlan[0].pspZeroValueVoucherPlanID;
                merchantPricePlan.pspMicroShopPlanID = pricePlan[0].pspMicroShopPlanID;
                merchantPricePlan.pspExpressShopPlanID = pricePlan[0].pspExpressShopPlanID;
                merchantPricePlan.pointOfServiceTypePrices = pricePlan[0].pointOfServiceTypePrices;

                if (isAlreadyNotExistMerchantPricePlan) {
                    merchantPricePlan._id = merchantPricePlanID;
                    merchantPricePlan.docType = 'merchantPricePlan';
                    merchantPricePlan.merchantID = merchant._id;
                    merchantPricePlan.partitionKey = merchant._id;
                    updateMerchant.pricePlan = {
                        merchantPricePlanID: merchantPricePlanID,
                        merchantPricePlanName: pricePlan[0].pricePlanName
                    };
                    return request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchant-priceplan`, {
                        json: true,
                        body: merchantPricePlan,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                } else {
                    updateMerchant.pricePlan = {
                        merchantPricePlanID: merchantPricePlan._id,
                        merchantPricePlanName: pricePlan[0].pricePlanName
                    };
                    return request.patch(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.body.merchantID}`, {
                        json: true,
                        body: updateMerchant,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                }
            } else if (isMerchantAccessible) { //else return whatever error is coming from get pricePlan api
                utils.setContextResError(
                    context,
                    new errors.PricePlanNotExistError(
                        'Price plan of specified details not exist',
                        404
                    )
                );
                return Promise.resolve();
            }
        })
        .then(result => {
            if (result) {
                return request.patch(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/merchants/${merchant._id}/merchant-priceplan`, {
                    json: true,
                    body: merchantPricePlan,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }
        })
        .then(result => {
            if (result) {
                const merchantLog = {};
                merchantLog._id = uuid.v4();
                merchantLog.docType = 'merchantLog';
                merchantLog.partitionKey = merchantLog._id;
                merchantLog.userID = userID;
                merchantLog.merchantID = merchant._id;
                merchantLog.merchantName = merchant.merchantName;
                merchantLog.actionText = 'Price plan set';
                merchantLog.actionCode = 'set';
                merchantLog.statusText = 'OK';
                merchantLog.statusCode = 'ok';
                merchantLog.result = 'changes done';
                merchantLog.createdDate = new Date();
                merchantLog.updatedDate = new Date();
                return request.post(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/merchant-log`, {
                    json: true,
                    body: merchantLog,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }
        })
        .then(result => {
            if (result) {
                return request.get(process.env.MERCHANT_API_URL + `/api/v1/merchants/${merchant._id}/merchant-billing`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }
        })
        .catch(error => {
            if (error.statusCode === 404) {
                const nextBillingDate = moment.utc().add(1, 'M')
                    .toDate();
                nextBillingDate.setDate(20);
                nextBillingDate.setUTCHours(3);
                nextBillingDate.setUTCMinutes(15);
                nextBillingDate.setUTCSeconds(0);
                const merchantBilling = {};
                merchantBilling._id = uuid.v4();
                merchantBilling.docType = 'merchantBilling';
                merchantBilling.partitionKey = merchantBilling._id;
                merchantBilling.merchantID = merchant._id;
                merchantBilling.merchantName = merchant.merchantName,
                merchantBilling.lastBillingDate = new Date();
                merchantBilling.nextBillingDate = nextBillingDate;
                merchantBilling.canceledDate = null;
                merchantBilling.createdDate = new Date();
                merchantBilling.updatedDate = new Date();
                return request.post(process.env.MERCHANT_API_URL + '/api/v1/merchant-billing', {
                    body: merchantBilling,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }
        })
        .then(result =>{
            if (result) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Update';
                logMessage.result = 'Set the merchant priceplan call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully updated the specified merchant price plan'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
