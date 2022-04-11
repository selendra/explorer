const Sentry = require('@sentry/node');

const constants = require('../config');
const utils = require('../utils');
const logger = require('../utils/logger');

Sentry.init({
    dsn: constants.SENTRY,
    tracesSampleRate: 1.0,
});

const crawlerName = 'activeAccounts';