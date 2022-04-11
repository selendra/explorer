const Sentry = require('@sentry/node');

const constants = require('../config');
const utils = require('../utils');
const logger = require('../utils/logger');

Sentry.init({
    dsn: constants.SENTRY,
    tracesSampleRate: 1.0,
  });
  

async function storeMetadata(api, blockNumber, blockHash, specName, specVersion, timestamp){
    const metadata = await api.rpc.state.getMetadata(blockHash);

    let data = {
        blockNumber,
        specName,
        specVersion,
        metadata_version: Object.keys(metadata.toHuman().metadata)[0],
        magic_number: metadata.magicNumber.toHuman(),
        metadata: metadata.toHuman().metadata,
        timestamp,
    };
  
    try {
      const runtimeCol = await utils.db.getRuntimeColCollection();
      await runtimeCol.insertOne(data)
      logger.debug(`Got runtime metadata at ${blockHash}!`);
    } catch (error) {
      logger.error(`Error fetching runtime metadata at ${blockHash}: ${JSON.stringify(error)}`);
      const scope = new Sentry.Scope();
      scope.setTag('blockNumber', blockNumber);
      Sentry.captureException(error, scope);
    }
  };

  module.exports = {
    storeMetadata
  }