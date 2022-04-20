const Sentry = require("@sentry/node");

const { backendConfig } = require("../config");
const utils = require("../utils");
const logger = require("../utils/logger");
const { harvestBlock } = require("../operatons/block");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

async function crawler(blockNumber) {
  logger.info("Starting block harvester...");

  const api = await utils.api.getAPI();
  const client = await utils.db.mongodbConnect();

  await harvestBlock(client, api, blockNumber, true, false);
}

crawler(43200).catch((error) => {
  logger.error(`Crawler error: ${error}`);
  Sentry.captureException(error);
  process.exit(1);
});
