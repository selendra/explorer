const Sentry = require('@sentry/node');

const { backendConfig } = require('../config');
const utils = require('../utils');
const logger = require('../utils/logger');
const { harvestBlock, harvestBlocks, harvestBlocksSeq, updateFinalizedBlock, storeMetadata, healthCheck } = require("../operatons/block")

Sentry.init({
    dsn: backendConfig.sentryDSN,
    tracesSampleRate: 1.0,
});

const config = backendConfig.crawlers.find(
    ({ name }) => name === 'blockHarvester',
);

async function getFinalishBlock(api) {
    const finalizedBlockHash = await api.rpc.chain.getFinalizedHead();
    const { block } = await api.rpc.chain.getBlock(finalizedBlockHash);
    const finalizedBlockNumber = block.header.number.toNumber();

    return finalizedBlockNumber
}

async function crawler(){
    logger.info('Starting block harvester...');

    const api = await utils.api.getAPI();
    const client = await utils.db.mongodbConnect();

    let synced = await utils.api.isNodeSynced(api);
    while (!synced) {
        await wait(10000);
        synced = await utils.api.isNodeSynced(api);
    }
    const blockCol = await utils.db.getBlockCollection(client);
    let saveBlock = await blockCol.countDocuments({});

    let finalizedBlockNumber = await getFinalishBlock(api);
    
    while((finalizedBlockNumber - saveBlock) != 0){
        // store current runtime metadata in first iteration
        if (saveBlock === 0) {
            let blockNumber = 1;
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
            const runtimeVersion = await api.rpc.state.getRuntimeVersion(blockHash);
            const apiAt = await api.at(blockHash);
            const timestamp = await apiAt.query.timestamp.now();
            const specName = runtimeVersion.toJSON().specName;
            const specVersion = runtimeVersion.specVersion;
            await storeMetadata(
              client,
              api,
              blockNumber,
              blockHash.toString(),
              specName.toString(),
              specVersion.toNumber(),
              timestamp.toNumber(),
            );
        }

        if (config.mode === 'chunks') {
            await harvestBlocks(client, config, api, saveBlock, finalizedBlockNumber);
        }else{
            await harvestBlocksSeq(client, api, saveBlock, finalizedBlockNumber)
        }

        finalizedBlockNumber =  await getFinalishBlock(api);
        saveBlock = await blockCol.countDocuments({});
    }

    // update accounts info for addresses found on block events data
    const doUpdateAccountsInfo = true;

    await api.rpc.chain.subscribeNewHeads(async (blockHeader) => {
        const blockNumber = blockHeader.number.toNumber();
  
        try {
            // fill block gap
            saveBlock = await blockCol.countDocuments({});
            if(saveBlock < blockNumber){
                for (let i = saveBlock; i <= blockNumber; i++) {
                    await healthCheck(client, i);
                    await harvestBlock(client, api, i, false, doUpdateAccountsInfo);
                } 
            } else{
                await healthCheck(client, blockNumber);
                await harvestBlock(client, api, blockNumber, false, doUpdateAccountsInfo);
            }
        } catch (error) {
          logger.error(`Error adding block #${blockNumber}: ${error}`);
          Sentry.captureException(error);
      }
  
      // track block finalization
      const finalizedBlockNumber = await getFinalishBlock(api);
      await updateFinalizedBlock(client, api, finalizedBlockNumber);
    })
}

crawler().catch((error) => {
    logger.error(`Crawler error: ${error}`);
    Sentry.captureException(error);
    process.exit(1);
});