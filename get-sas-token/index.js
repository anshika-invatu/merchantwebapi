const utils = require('../utils');
const Promise = require('bluebird');
const errors = require('../errors');

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

 
    return utils.generateSasToken()
        .then(token => {
            if (token) {
                context.res = {
                    body: token
                };
            }
        })
        .catch(error => utils.handleError(context, error));
};