const Sentry = require('@sentry/node');

const utils = require('../utils');
const logger = require('../utils/logger');
const constants = require('../config');

Sentry.init({
    dsn: constants.SENTRY,
    tracesSampleRate: 1.0,
});

async function processLog(blockNumber, log, index, timestamp){
    const { type } = log;
    // this can change in the future...
    const [[engine, logData]] =
      type === 'RuntimeEnvironmentUpdated'
        ? [[null, null]]
        : Object.values(log.toHuman());

    const data = {
        blockNumber, index, type, engine, logData, timestamp
    };

    try {
        let logCol = await utils.db.getLogColCollection();
        await logCol.insertOne(data);

        logger.info(`Added log ${blockNumber}-${index}`);
    } catch (error) {
        logger.error(`Error adding log ${blockNumber}-${index}: ${JSON.stringify(error)}`);
        const scope = new Sentry.Scope();
        scope.setTag('Log', blockNumber);
        Sentry.captureException(error, scope);
    }
};

async function processLogs(blockNumber, logs, timestamp){
    const startTime = new Date().getTime();
    await Promise.all(
      logs.map((log, index) =>
        processLog(blockNumber, log, index, timestamp),
      ),
    );
    // Log execution time
    const endTime = new Date().getTime();
    logger.info(`Added ${logs.length} logs in ${((endTime - startTime) / 1000).toFixed(3)}s`,
    );
};
  
module.exports = {
    processLogs
}