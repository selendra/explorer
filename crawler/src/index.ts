/* eslint-disable no-console */
import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import config from './config';
import { lastBlockInDatabase, deleteUnfinishedBlocks } from './crud';
import logger from './utils/logger';
import { promiseWithTimeout, nodeProvider } from './utils';

/* eslint "no-underscore-dangle": "off" */
Sentry.init({
  dsn: config.sentryDns,
  tracesSampleRate: 1.0,
  integrations: [
    new RewriteFrames({
      root: global.__dirname,
    }),
  ],
  environment: config.environment,
});

Sentry.setTag('component', 'crawler');
Sentry.setTag('network', config.network);

// eslint-disable-next-line no-console
console.warn = () => {};

const crawler = async () => {
  // eslint-disable-next-line prefer-const
  let currentBlockIndex = await lastBlockInDatabase();
  console.log(currentBlockIndex);
};

Promise.resolve()
  .then(async () => {
    await nodeProvider.initializeProviders();
    logger.info('Removing unfinished blocks...');
    await deleteUnfinishedBlocks();
  })
  .then(() => {
    logger.info(`Contract verification sync: ${config.verifiedContractSync}`);
  })
  .then(crawler)
  .then(async () => {
    await nodeProvider.closeProviders();
    logger.info('Finished');
    process.exit();
  })
  .catch(async (error) => {
    logger.error(error);
    Sentry.captureException(error);

    try {
      await promiseWithTimeout(nodeProvider.closeProviders(), 200, Error('Failed to close proivders!'));
    } catch (err) {
      Sentry.captureException(err);
    }

    logger.error('Finished');
    Sentry.close(2000).then(() => {
      process.exit(-1);
    });
  });
