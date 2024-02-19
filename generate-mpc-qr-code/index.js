'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
var ab2str = require('arraybuffer-to-string');
const generateMPCQR = require('../spec/sample-docs/GenerateMPCQR');

//Please refer bac-241,319 for this endpoint related details

module.exports = (context, req) => {
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
    let mobilePaymentCodeDoc, paymentProviderDoc, mpc;
    return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/mobile-payment-codes/${req.params.mobilePaymentCodeID}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.PRODUCT_API_KEY
        }
    })
        .then(mobilePaymentCode => {
            if (mobilePaymentCode) {
                mobilePaymentCodeDoc = mobilePaymentCode;
                mpc = mobilePaymentCodeDoc.mpcPrefix;
                return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/mobile-payment-providers`, {
                    body: req.body,
                    json: true,
                    headers: {
                        'x-functions-key': process.env.PRODUCT_API_KEY
                    }
                });
            }
        })
        .then(paymentProvider => {
            if (paymentProvider) {
                paymentProviderDoc = paymentProvider;
                return request.get(`${process.env.PRODUCT_API_URL}/api/${process.env.PRODUCT_API_VERSION}/products/${mobilePaymentCodeDoc.productID}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.PRODUCT_API_KEY
                    }
                });
            }
        })
        .then(product => {
            if (product) {
                let paymentProviderAccount;
                if (paymentProviderDoc && paymentProviderDoc.paymentProviders && Array.isArray(paymentProviderDoc.paymentProviders)) {
                    paymentProviderDoc.paymentProviders.forEach(element => {
                        if (element.paymentProvider === 'Swish') {
                            paymentProviderAccount = element.paymentProviderAccount.replace(/\D/g, '');
                        }
                    });
                }

                generateMPCQR.format = 'png';
                generateMPCQR.size = 300;
                if (mpc && mpc.length <= 10) {
                    const mpcPrefix = mpc.toUpperCase();
                    generateMPCQR.message.value = `${mpcPrefix}:${req.params.mobilePaymentCodeID}`;
                } else if (mpc && mpc.length > 10) {
                    const mpcPrefix = mpc.toUpperCase().substring(0, 10);
                    generateMPCQR.message.value = `${mpcPrefix}:${req.params.mobilePaymentCodeID}`;
                } else if (!mpc) {
                    generateMPCQR.message.value = `SHOP:${req.params.mobilePaymentCodeID}`;
                }
                generateMPCQR.amount.value = product.salesPrice;
                generateMPCQR.amount.currency = product.currency;
                generateMPCQR.payee.value = paymentProviderAccount;
                generateMPCQR.currency.value = product.currency;
                return request.post(`${process.env.GETSWISH}` + '/qrg-swish/api/v1/prefilled', {
                    body: generateMPCQR,
                    json: true,
                    encoding: null
                });
            }
        })
        .then(result => {
            if (result) {
                const base64 = ab2str(result, 'base64');
                context.res = {
                    body: base64,
                    status: 200
                };
            }

        })
        .catch(error => {
            utils.handleError(context, error);
        });
};