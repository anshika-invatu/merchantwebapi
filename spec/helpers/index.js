'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

exports.API_URL = process.env.FUNCTION_STAGING_URL || 'http://localhost:7071';
