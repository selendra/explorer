const Sentry = require("@sentry/node");

const { backendConfig } = require("../config");
const utils = require("../utils");
const logger = require("../utils/logger");
const {
  processAccountsChunk,
  fetchAccountIds,
} = require("../operatons/account");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

const config = backendConfig.crawlers.find(
  ({ name }) => name === "activeAccounts"
);

const { chunkSize } = config;

async function crawler(delayedStart) {
  if (delayedStart && config.startDelay) {
    logger.debug(
      `Delaying active accounts crawler start for ${config.startDelay / 1000}s`
    );
    await utils.wait(config.startDelay);
  }

  logger.debug("Running active accounts crawler...");

  const api = await utils.api.getAPI();
  const client = await utils.db.mongodbConnect();

  let synced = await utils.api.isNodeSynced(api);
  while (!synced) {
    await utils.wait(10000);
    synced = await utils.api.isNodeSynced(api);
  }

  const startTime = new Date().getTime();
  const accountIds = await fetchAccountIds(api);

  logger.info(`Got ${accountIds.length} active accounts`);
  const chunks = utils.chunker(accountIds, chunkSize);
  logger.info(`Processing chunks of ${chunkSize} accounts`);

  for (const chunk of chunks) {
    const chunkStartTime = Date.now();
    await Promise.all(
      chunk.map((accountId) => processAccountsChunk(client, api, accountId))
    );
    const chunkEndTime = new Date().getTime();
    logger.info(
      `Processed chunk ${chunks.indexOf(chunk) + 1}/${chunks.length} in ${(
        (chunkEndTime - chunkStartTime) /
        1000
      ).toFixed(config.statsPrecision)}s`
    );
  }

  logger.debug("Disconnecting from DB");
  await client.close().catch((error) => {
    logger.error(`DB disconnect error: ${JSON.stringify(error)}`);
    Sentry.captureException(error);
  });

  logger.debug("Disconnecting from API");
  await api.disconnect().catch((error) => {
    logger.error(`API disconnect error: ${JSON.stringify(error)}`);
    Sentry.captureException(error);
  });

  const endTime = new Date().getTime();
  logger.info(
    `Processed ${accountIds.length} active accounts in ${(
      (endTime - startTime) /
      1000
    ).toFixed(0)}s`
  );
  logger.info(
    `Next execution in ${(config.pollingTime / 60000).toFixed(0)}m...`
  );

  setTimeout(() => crawler(false), config.pollingTime);
}

crawler(true).catch((error) => {
  logger.error(`Crawler error: ${error}`);
  Sentry.captureException(error);
  process.exit(-1);
});
