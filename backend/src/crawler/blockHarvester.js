const Sentry = require('@sentry/node');

const { backendConfig } = require('../config');
const utils = require('../utils');
const logger = require('../utils/logger');
const { processAccountsChunk, fetchAccountIds } = require("../operatons/account")

Sentry.init({
    dsn: backendConfig.sentryDSN,
    tracesSampleRate: 1.0,
});

const config = backendConfig.crawlers.find(
    ({ name }) => name === 'blockHarvester',
);

async function crawler(delayedStart){
    if (delayedStart && config.startDelay) {
        logger.debug(`Delaying active accounts crawler start for ${config.startDelay / 1000}s`);
        await utils.wait(config.startDelay);
    }
}