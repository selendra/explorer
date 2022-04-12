const Sentry = require('@sentry/node');

const { backendConfig } = require('../config');
const utils = require('../utils');
const logger = require('../utils/logger');
const { harvestBlocks, harvestBlock } = require("../operatons/block")

Sentry.init({
    dsn: backendConfig.sentryDSN,
    tracesSampleRate: 1.0,
});

const config = backendConfig.crawlers.find(
    ({ name }) => name === 'blockHarvester',
);

async function crawler(){
    logger.info('Starting block harvester...');

    const api = await utils.api.getAPI();
    let synced = await utils.api.isNodeSynced(api);
    while (!synced) {
        await wait(10000);
        synced = await utils.api.isNodeSynced(api);
    }

    const blockCol = await utils.db.getBlockCollection();
    let presentBlock = parseInt(await api.query.system.number());
    let saveBlock = await blockCol.countDocuments({});

    await harvestBlocks(config, api, saveBlock, presentBlock);
    while(true) {
        presentBlock = parseInt(await api.query.system.number());
        saveBlock = await blockCol.countDocuments({});

        if(saveBlock >= presentBlock) {
          await sleep(6000);
          continue;
        };
        await harvestBlock(api, saveBlock, true);
    }
}

crawler().catch((error) => {
    logger.error(`Crawler error: ${error}`);
    Sentry.captureException(error);
    process.exit(-1);
});