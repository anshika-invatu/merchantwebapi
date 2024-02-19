'use strict';


//Health check

module.exports = async (context) => {
   
    context.res = {
        body: {
            code: 200,
            text: 'ping'
        }
    };
};
