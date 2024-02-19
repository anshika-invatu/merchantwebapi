'use strict';

const utils = require('../utils');
const request = require('request-promise');

module.exports = async (context, req) => {
    try {
        const result = await request.post(`${process.env.DEVICE_API_URL}/api/${process.env.DEVICE_API_VERSION}/get-manufacturer-models`, {
            json: true,
            body: req.body,
            headers: {
                'x-functions-key': process.env.DEVICE_API_KEY
            }
        });
        
        if (result) {
            context.res = {
                body: result
            };
        }
    } catch (error) {
        utils.handleError(context, error);
    }
};
