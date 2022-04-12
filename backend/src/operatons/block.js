const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

const utils = require('../utils');
const logger = require('../utils/logger');
const { backendConfig } = require('../config');

const { updateAccountsInfo } = require('./account');
const { processEvents } = require('./event');
const { processExtrinsics } = require('./extrinsic');
const { storeMetadata } = require('./runtime');
const { processLogs } = require('./log');

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

function getDisplayName(identity) {
    if (
      identity.displayParent &&
      identity.displayParent !== '' &&
      identity.display &&
      identity.display !== ''
    ) {
      return `${identity.displayParent} / ${identity.display}`;
    }
    return identity.display || '';
};

async function updateFinalized(finalizedBlock){
  let blockQuery = { blockNumber: finalizedBlock };

  try {
    const blockCol = await utils.db.getBlockCollection();
    await blockCol.findOneAndUpdate(blockQuery ,{$set:{"finalized": true}});
  } catch (error) {
    Sentry.captureException(error);
  }
};

async function processBlock(api, blockNumber, doUpdateAccountsInfo){
  const startTime = new Date().getTime();
    try {
      const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
      const apiAt = await api.at(blockHash);

      const [
        derivedBlock,
        total,
        runtimeVersion,
        activeEra,
        currentIndex,
      ] = await Promise.all([
        api.derive.chain.getBlock(blockHash),
        apiAt.query.balances.totalIssuance(),
        api.rpc.state.getRuntimeVersion(blockHash),
        apiAt.query?.staking.activeEra
          ? apiAt.query.staking.activeEra().then((res) => res.unwrap().index)
          : 0,
        apiAt.query.session.currentIndex(),
      ]);
      
      const { block, author, events } = derivedBlock;
      const blockAuthor = author ? author.toString() : ''; // genesis block doesn't have author
      const { parentHash, extrinsicsRoot, stateRoot } = block.header;
      const blockAuthorIdentity = await api.derive.accounts.info(blockAuthor);
      const blockAuthorName = getDisplayName(blockAuthorIdentity.identity);

      // genesis block doesn't expose timestamp or any other extrinsic
      const timestamp =
        blockNumber !== 0
          ? parseInt(
            block.extrinsics
              .find(
                ({ method: { section, method } }) =>
                  section === 'timestamp' && method === 'set',
              )
              .args[0].toString(),
            10,
          )
          : 0;

      // Totals
      const totalEvents = events.length;
      const totalExtrinsics = block.extrinsics.length;
      let totalIssuance = new BigNumber(total).dividedBy(1e18).toNumber();

      const query = { blockNumber: blockNumber };
      const options = { upsert: true };
      const data = {
        $set: { 
          blockNumber,
          finalized: false,
          blockAuthor,
          blockAuthorName,
          blockHash: blockHash.toHuman(),
          parentHash: parentHash.toHuman(),
          extrinsicsRoot: extrinsicsRoot.toHuman(),
          stateRoot: stateRoot.toHuman(),
          activeEra: parseInt(activeEra),
          currentIndex: parseInt(currentIndex),
          runtimeVersion: parseInt(runtimeVersion.specVersion),
          totalEvents: totalEvents,
          totalExtrinsics: totalExtrinsics,
          totalIssuance: totalIssuance,
          timestamp,
        }
      };

      try {
        const blockCol = await utils.db.getBlockCollection();
        await blockCol.updateOne(query, data, options);

        const endTime = new Date().getTime();
        logger.info(
          `Added block #${blockNumber} in ${((endTime - startTime) / 1000)}s`,
        );
      } catch (error) {
          logger.error(`Error adding block #${blockNumber}: ${error}`);
          const scope = new Sentry.Scope();
          scope.setTag('blockNumber', blockNumber);
          Sentry.captureException(error, scope);
      }

      //Runtime upgrade
      const runtimeUpgrade = events.find(
        ({ event: { section, method } }) =>
          section === 'system' && method === 'CodeUpdated',
      );

      if (runtimeUpgrade) {
        const specName = runtimeVersion.toJSON().specName;
        const specVersion = runtimeVersion.specVersion;
        await storeMetadata(api, blockNumber, blockHash, specName, specVersion, timestamp);
      }

      await Promise.all([
        // Store block extrinsics
        processExtrinsics(
          api,
          blockNumber,
          blockHash,
          block.extrinsics,
          events,
          timestamp
        ),

        // Store module events
        processEvents(
          blockNumber,
          parseInt(activeEra.toString()),
          events,
          block.extrinsics,
          timestamp
        ),

        // Store block logs
        processLogs(
          blockNumber,
          block.header.digest.logs,
          timestamp
        ),

        doUpdateAccountsInfo ? await updateAccountsInfo(api, blockNumber, timestamp, events): false
      ]);

    } catch (error) {
      logger.error(`Error adding block #${blockNumber}: ${error}`);
      const scope = new Sentry.Scope();
      scope.setTag('blockNumber', blockNumber);
      Sentry.captureException(error, scope);
    }
}

async function healthCheck(blockNumber) {
  const startTime = new Date().getTime();
  logger.info('Starting health check');
  
  let query = { blockNumber: blockNumber };

  const blockCol = await utils.db.getBlockCollection();
  const eventCol = await utils.db.getEventCollection();
  const extrinsicCol = await utils.db.getExtrinsicCollection();

  try {
    let blockdb = await blockCol.findOne(query);
    let eventdb = await eventCol.find(query).toArray();
    let extrinsicdb = await extrinsicCol.find(query).toArray();
  
    if (blockdb.totalEvents !== eventdb.length || blockdb.totalExtrinsics !== extrinsicdb.length) {
      await blockCol.deleteMany(query);
      await eventCol.deleteMany(query);
      await extrinsicCol.deleteMany(query);
    } else {
      logger.info(`Block have no duplicate field`);
    }    
  } catch (error) {
      logger.info(`Block number not exit`);
  }
  
  const endTime = new Date().getTime();
  logger.debug(`Health check finished in ${((endTime - startTime) / 1000)}s`);
}


async function testInsertBlock() {
  let api = await utils.api.apiProvider();
  let block_number = 114921;
  // let block_number = 131521;
  await healthCheck(block_number);
  await processBlock(api, block_number, true);
  // // await updateFinalized(11112);

  process.exit(0)
}

testInsertBlock()