import * as Sentry from '@sentry/node';
import config from '../../../config';
import { logger, queryv2 } from '../../../utils';

Sentry.init({
  dsn: config.sentryDns,
  tracesSampleRate: 1.0,
});

const processLog = async (
  blockId: number,
  log: any,
  index: number,
  timestamp: string,
): Promise<void> => {
  const { type } = log;
  // this can change in the future...
  const [[engine, logData]] = type === 'RuntimeEnvironmentUpdated' ? [[null, null]] : Object.values(log.toHuman());
  try {
    await queryv2(
      `INSERT INTO log
        (block_id, index, type, engine, data, timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6)`,
      [blockId, index, type, engine, logData, timestamp],
    );
    logger.info(`Added log ${blockId}-${index}`);
  } catch (error) {
    logger.info(
      `Error adding log ${blockId}-${index}: ${JSON.stringify(error)}`,
    );
    const scope = new Sentry.Scope();
    scope.setTag('blockId', blockId);
    Sentry.captureException(error, scope);
  }
};

export default processLog;
