'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const uuid = require('uuid');
const accountListDoc = require('../spec/sample-docs/AccountList');

//Please refer the story bac-277,373, 399 for more details

module.exports = async (context, req) => {
    const executionStart = new Date();
    let isPricePlanExist = false;
    const merchantPricePlan = {};
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
                'You have requested to create merchant but the request body seems to be empty. Kindly pass the merchant fields using request body in application/json format',
                400
            )
        );
        return Promise.reject();
    }
    let newMerchant;
    const merchantPricePlanID = uuid.v4();
    const userID = utils.decodeToken(req.headers.authorization)._id;

    if (!req.body.billingProvider) {
        req.body.billingProvider = 'stripe';
    }

    let customerData;
    if (req.body.billingProvider.toLowerCase() === 'stripe') {
        customerData = await utils.createStripeCustomer(req.body.email);
        req.body.pspName = 'stripe';
        req.body.pspAccount = customerData.id;
        req.body.pspEmail = req.body.email;
        req.body.billingProviders = [{
            name: 'stripe',
            customerID: customerData.id
        }];
        req.body.currentBillingOption = 'stripe';
    } else if (req.body.billingProvider.toLowerCase() === 'fortnox') {
        customerData = await utils.createFortnoxCustomer(req.body);
        if (customerData && customerData.Customer) {
            req.body.billingProviders = [{
                name: 'fortnox',
                customerID: customerData.Customer.CustomerNumber,
            }];
            req.body.currentBillingOption = 'fortnox';
            req.body.customerNumber = customerData.Customer.CustomerNumber;
        }
    }

    req.body.isEnabled = true;
    if (!req.body.payoutFrequency) {
        req.body.payoutFrequency = 'monthly';
    }
    return request.get(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/countries`, {
        json: true,
        headers: {
            'x-functions-key': process.env.MERCHANT_API_KEY
        }
    })
        .then(countrydoc => {
            if (countrydoc && countrydoc._id) {
                if (countrydoc.countries && Array.isArray(countrydoc.countries)) {
                    countrydoc.countries.forEach((item) => {
                        if (item.countryCode === req.body.countryCode) {
                            req.body.merchantCurrency = item.currency;
                            req.body.walletCurrency = item.currency;
                        }
                    });
                }
            }
            return request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/priceplans?country=${req.body.countryCode}&currency=${req.body.merchantCurrency}`, { //Get price plan
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        })
        .then(pricePlan => {
            if (pricePlan && Array.isArray(pricePlan) && pricePlan.length) {
                context.log('add merchant price plan for the merchantId = ' + req.body._id);
                isPricePlanExist = true;
                req.body.isMerchantHandlingSettlement = false;
                req.body.pricePlan = {
                    merchantPricePlanID: merchantPricePlanID,
                    merchantPricePlanName: 'Basic'
                };
                merchantPricePlan._id = merchantPricePlanID;
                merchantPricePlan.docType = 'merchantPricePlan';
                merchantPricePlan.merchantID = req.body._id;
                merchantPricePlan.partitionKey = req.body._id;
                merchantPricePlan.pricePlanName = 'Basic';
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
                merchantPricePlan.createdDate = new Date();
                merchantPricePlan.updatedDate = new Date();
            } else {
                context.log('price plan not exist for this country = ' + req.body.countryCode + ' and currency = ' + req.body.merchantCurrency + ', so price plan not set in merchant = ' + req.body._id);
            }
            req.body.parentMerchantID = req.body.selectedMerchantID;
            context.log('Selected merchantID = ' + req.body.selectedMerchantID);
            context.log('Parent merchantID = ' + req.body.parentMerchantID);
            return request.post(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants`, {
                json: true,
                body: req.body,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
        })
        .then(merchant => {
            if (merchant) {
                newMerchant = merchant;
                if (isPricePlanExist) {
                    return request.post(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/merchant-priceplan`, {
                        json: true,
                        body: merchantPricePlan,
                        headers: {
                            'x-functions-key': process.env.MERCHANT_API_KEY
                        }
                    });
                }
            }
        })
        .then(result => {
            if (result) {
                const merchantLog = {};
                merchantLog._id = uuid.v4();
                merchantLog.docType = 'merchantLog';
                merchantLog.partitionKey = merchantLog._id;
                merchantLog.userID = userID;
                merchantLog.merchantID = newMerchant._id;
                merchantLog.merchantName = newMerchant.merchantName;
                merchantLog.actionText = 'Merchant created';
                merchantLog.actionCode = 'created';
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
        .then(() => {
            return request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
                json: true,
                headers: {
                    'x-functions-key': process.env.USER_API_KEY
                }
            });
        })
        .then(result => {
            if (result) {
                return request.post(`${process.env.USER_API_URL}/api/v1/merchants/${newMerchant._id}/users/${token._id}`, {
                    json: true,
                    body: {
                        merchantID: newMerchant._id,
                        merchantName: newMerchant.merchantName,
                        userGroups: '',
                        roles: 'admin'
                    },
                    headers: {
                        'x-functions-key': process.env.USER_API_KEY
                    }
                });
            }
        })
        .then(result => {
            if (result.code === 200) {
                if (accountListDoc.accounts && Array.isArray(accountListDoc.accounts)) {
                    for (var i = 0; i < accountListDoc.accounts.length; i++) {
                        accountListDoc.accounts[i].currency = newMerchant.merchantCurrency;
                    }
                }
                if (accountListDoc.productClasses && Array.isArray(accountListDoc.productClasses)) {
                    for (var j = 0; j < accountListDoc.productClasses.length; j++) {
                        accountListDoc.productClasses[j].currency = newMerchant.merchantCurrency;
                    }
                }
                accountListDoc._id = uuid.v4();
                accountListDoc.docType = 'accountList';
                accountListDoc.partitionKey = newMerchant._id;
                accountListDoc.merchantID = newMerchant._id;
                accountListDoc.countryCode = newMerchant.countryCode;
                accountListDoc.createdDate = new Date();
                accountListDoc.updatedDate = new Date();
                return request.post(`${process.env.LEDGERS_API_URL}/api/v1/account-lists`, { //create default account list(bac-186)
                    json: true,
                    body: accountListDoc,
                    headers: {
                        'x-functions-key': process.env.LEDGERS_API_KEY
                    }
                });
            }
        })
        .then((accountList) => {
            if (accountList) {
                var allrequest = [];//bac-183 regarding balance account  type.
                const balanceAccountType = ['balance', 'voucher', 'cashcard', 'cashpool'];
                for (var i = 0; i < balanceAccountType.length; i++) {
                    const balanceAccount = utils.balanceAccounts(newMerchant);//create default balanceAccount in bac- 182
                    balanceAccount.balanceAccountType = balanceAccountType[i];
                    allrequest.push(request.post(process.env.VOUCHER_API_URL + `/api/${process.env.VOUCHER_API_VERSION}/balance-accounts`, {
                        body: balanceAccount,
                        json: true,
                        headers: {
                            'x-functions-key': process.env.VOUCHER_API_KEY
                        }
                    }));
                }
                return Promise.all(allrequest);
            }
        })
        .then(balanceAccountResults => {
            if (balanceAccountResults && Array.isArray(balanceAccountResults)) {
                balanceAccountResults.forEach(balanceAccountResult => {
                    if (balanceAccountResult.balanceAccountType === 'cashpool') {
                        const cashpools = {
                            balanceAccountID: balanceAccountResult._id,
                            balanceAccountName: balanceAccountResult.balanceAccountName,
                            balanceAccountDescription: balanceAccountResult.balanceAccountDescription,
                            balanceAccountType: balanceAccountResult.balanceAccountType,
                            balanceCurrency: balanceAccountResult.balanceCurrency
                        };
                        if (newMerchant.cashpools && Array.isArray(newMerchant.cashpools)) {
                            newMerchant.cashpools.push(cashpools);
                        } else {
                            newMerchant.cashpools = new Array(cashpools);
                        }
                    } else {
                        const balanceAccounts = {
                            balanceAccountID: balanceAccountResult._id,
                            balanceAccountName: balanceAccountResult.balanceAccountName,
                            balanceAccountDescription: balanceAccountResult.balanceAccountDescription,
                            balanceAccountType: balanceAccountResult.balanceAccountType,
                            balanceCurrency: balanceAccountResult.balanceCurrency,
                            lastPayoutTransactionID: '',
                            lastPayout: ''
                        };
                        if (newMerchant.balanceAccounts && Array.isArray(newMerchant.balanceAccounts)) {
                            newMerchant.balanceAccounts.push(balanceAccounts);
                        } else {
                            newMerchant.balanceAccounts = new Array(balanceAccounts);
                        }
                    }
                });
                return request.patch(process.env.MERCHANT_API_URL + `/api/${process.env.MERCHANT_API_VERSION}/merchants/${newMerchant._id}`, {
                    body: { balanceAccounts: newMerchant.balanceAccounts, cashpools: newMerchant.cashpools },
                    json: true,
                    headers: {
                        'x-functions-key': process.env.MERCHANT_API_KEY
                    }
                });
            }
        })
        .then(isUpdateMerchantDoc => {
            if (isUpdateMerchantDoc) {
                const logMessage = {};
                logMessage.responseTime = `${(new Date() - executionStart)} ms`; // duration in ms
                logMessage.operation = 'Create';
                logMessage.result = 'Create Merchant call completed successfully';
                utils.logInfo(logMessage);
                context.res = {
                    body: newMerchant
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
