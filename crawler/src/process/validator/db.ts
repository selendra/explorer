import * as Sentry from '@sentry/node';
import { Client, QueryResult } from 'pg';
import config from '../../config';
import { logger } from '../../utils';

Sentry.init({
  dsn: config.sentryDns,
  tracesSampleRate: 1.0,
});

export const getClient = async (): Promise<Client> => {
  logger.info(
    `Connecting to DB ${config.postgresConfig.database} at ${config.postgresConfig.host}:${config.postgresConfig.port}`,
  );
  const client = new Client(config.postgresConfig);
  await client.connect();
  return client;
};

export const dbQuery = async (
  client: Client,
  sql: string,
): Promise<QueryResult<any> | null> => {
  try {
    return await client.query(sql);
  } catch (error) {
    logger.error(`SQL: ${sql} ERROR: ${JSON.stringify(error)}`);
    Sentry.captureException(error);
  }
  return null;
};

export const dbParamQuery = async (
  client: Client,
  sql: string,
  data: any[],
): Promise<QueryResult<any> | null> => {
  try {
    return await client.query(sql, data);
  } catch (error) {
    logger.error(
      `SQL: ${sql} PARAM: ${JSON.stringify(data)} ERROR: ${JSON.stringify(
        error,
      )}`,
    );
    Sentry.captureException(error);
  }
  return null;
};
