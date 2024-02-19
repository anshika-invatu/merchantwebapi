'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');
const validator = require('validator');
const moment = require('moment');

//Please refer bac-395 for this endpoint related details

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
                'You\'ve requested to create a new low value order but the request body seems to be empty. Kindly pass request body in application/json format',
                400
            )
        );
        return Promise.resolve();
    }

    if (!req.body.merchantID || !req.body.webshopID || !req.body.productID || !req.body.sendDate || !req.body.receiversList || !Array.isArray(req.body.receiversList) || req.body.receiversList.length < 1) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'You\'ve requested to create a low value order but all parameters (merchantID, webshopID, productID, sendDate and receiversList) are not present in req body.',
                400
            )
        );
        return Promise.resolve();
    }

    if (req.body.receiversList && Array.isArray(req.body.receiversList) && req.body.receiversList.length > 10) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Maximum 10 receiver element(email and mobilePhone) send in receiversList at a time.',
                400
            )
        );
        return Promise.resolve();
    }
    const validReciverList = [];
    req.body.receiversList.forEach(element => {
        const emailAndPhone = {};
        if (validator.isEmail(`${element.email}`)) {
            emailAndPhone.email = element.email;
        }
        if (element.mobilePhone) {
            emailAndPhone.mobilePhone = element.mobilePhone;
        }
        if (emailAndPhone.email || emailAndPhone.mobilePhone) {
            validReciverList.push(emailAndPhone);
        }
    });
    if (validReciverList.length < 1) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Minimum  1 correct receiver element(email or mobilePhone) send in receiversList.',
                400
            )
        );
        return Promise.resolve();
    }

    const sendDate = moment(req.body.sendDate).format('YYYY-MM-DD');

    if (sendDate.includes('Invalid date')) {
        utils.setContextResError(
            context,
            new errors.FieldValidationError(
                'Please pass the valid send date.',
                400
            )
        );
        return Promise.resolve();
    }
    

    let isMerchantLinked = false;
    return request.get(`${process.env.USER_API_URL}/api/v1/users/${utils.decodeToken(req.headers.authorization)._id}`, {
        json: true,
        headers: {
            'x-functions-key': process.env.USER_API_KEY
        }
    }).then(user => {
        for (var i = 0, len = user.merchants.length; i < len; i++) {
            if (user.merchants[i].merchantID === req.body.merchantID) {   //Validate whether user is allowed to see merchant data or not?
                isMerchantLinked = true;
            }
        }
        if (isMerchantLinked) {
            return request.post(`${process.env.ORDER_API_URL}/api/${process.env.ORDER_API_VERSION}/low-value-orders`, {
                body: Object.assign({}, req.body, { receiversList: validReciverList }),
                json: true,
                headers: {
                    'x-functions-key': process.env.ORDER_API_KEY
                }
            });
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'MerchantID not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
    })
        .then(result => {
            if (result) {
                context.res = {
                    body: result
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};
