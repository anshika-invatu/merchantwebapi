'use strict';

const utils = require('../utils');
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

    return utils.deleteBlob(req.params.blobName)
        .then(result => {
            if (result) {
                context.res = {
                    body: {
                        code: 200,
                        description: 'Successfully deleted the blob'
                    }
                };
            }
        })
        .catch(error => utils.handleError(context, error));

};
