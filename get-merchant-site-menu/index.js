'use strict';

const utils = require('../utils');
const request = require('request-promise');
const errors = require('../errors');

//Please refer the story BASE-65 for more details

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

        let isMerchantLinked = false;
        var token = utils.decodeToken(req.headers.authorization);
        const user = await request.get(`${process.env.USER_API_URL}/api/v1/users/${token._id}`, { //Get User
            json: true,
            headers: {
                'x-functions-key': process.env.USER_API_KEY
            }
        });
        if (user && Array.isArray(user.merchants) && user.merchants.length) {
            user.merchants.forEach(element => {
                if (element.merchantID === req.params.merchantID) {
                    isMerchantLinked = true;
                }
            });
        }
        let result;
        if (isMerchantLinked) {
            const merchant = await request.get(`${process.env.MERCHANT_API_URL}/api/${process.env.MERCHANT_API_VERSION}/merchants/${req.params.merchantID}`, {
                json: true,
                headers: {
                    'x-functions-key': process.env.MERCHANT_API_KEY
                }
            });
            if (merchant && merchant.siteMenuID) {
                result = await request.get(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/merchant-site-menu/${merchant.siteMenuID}`, {
                    json: true,
                    headers: {
                        'x-functions-key': process.env.DEVICE_API_KEY
                    },
                    body: req.body
                });
            } else {
                utils.setContextResError(
                    context,
                    new errors.SiteMenuIDNotFoundError(
                        'siteMenuID does not exist in merchant doc',
                        403
                    )
                );
                return Promise.resolve();
            }
        } else {
            utils.setContextResError(
                context,
                new errors.UserNotAuthenticatedError(
                    'Merchants not linked to this user.',
                    401
                )
            );
            return Promise.resolve();
        }
        if (result) {
            if (req.query.languageCode && result.menu && Array.isArray(result.menu)) {
                await removeExtraText(result);
            }
            context.res = {
                body: result
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }

    async function removeExtraText (result) {

        for (let i = 0; i < result.menu.length; i++) {
            let matchingLanguageText;
            for (const prop in result.menu[i].texts) {
                if (prop.toLowerCase() === req.query.languageCode.toLowerCase()) {
                    matchingLanguageText = result.menu[i].texts[prop].text;
                }
            }
            delete result.menu[i].texts;
            result.menu[i].text = matchingLanguageText;
            if (result.menu[i].childNodes && Array.isArray(result.menu[i].childNodes)) {
                for (let j = 0; j < result.menu[i].childNodes.length; j++) {
                    let matchingLanguageChildText;
                    for (const childProp in result.menu[i].childNodes[j].texts) {
                        if (childProp.toLowerCase() === req.query.languageCode.toLowerCase()) {
                            matchingLanguageChildText = result.menu[i].childNodes[j].texts[childProp].text;
                        }
                    }
                    delete result.menu[i].childNodes[j].texts;
                    result.menu[i].childNodes[j].text = matchingLanguageChildText;
                }
            }
        }
    }

};
