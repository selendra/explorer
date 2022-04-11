const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

const utils = require('../utils');
const logger = require('../utils/logger');
const constants = require('../config');
const { processExtrinsics } = require('./extrinsic');
const { updateAccountsInfo } = require('./account');

Sentry.init({
  dsn: constants.SENTRY,
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

async function storeMetadata(api, blockNumber, blockHash, specName, specVersion, timestamp){
  const metadata = await api.rpc.state.getMetadata(blockHash);

  try {
    const runtimeCol = await utils.db.getRuntimeColCollection();
    await runtimeCol.insertOne({
        blockNumber,
        specName,
        specVersion,
        metadata_version: Object.keys(metadata.toHuman().metadata)[0],
        magic_number: metadata.magicNumber.toHuman(),
        metadata: metadata.toHuman().metadata,
        timestamp,
    })
    logger.info(`Got runtime metadata at ${blockHash}!`);
  } catch (error) {
    logger.error(`Error fetching runtime metadata at ${blockHash}: ${JSON.stringify(error)}`);
    const scope = new Sentry.Scope();
    scope.setTag('blockNumber', blockNumber);
    Sentry.captureException(error, scope);
  }
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

      try {
        const blockCol = await utils.db.getBlockCollection();
        await blockCol.insertOne({
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
          })
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

      if (runtimeUpgrade || blockNumber === 114921 ) {
        const specName = runtimeVersion.toJSON().specName;
        const specVersion = runtimeVersion.specVersion;
        await storeMetadata(api, blockNumber, blockHash, specName, specVersion, timestamp);
      }
      
      // Store block extrinsics
      await processExtrinsics(
        api,
        blockNumber,
        blockHash,
        block.extrinsics,
        events,
        timestamp,
      ),

      doUpdateAccountsInfo ? await updateAccountsInfo(api, blockNumber, timestamp, events): false;

    } catch (error) {
      logger.error(`Error adding block #${blockNumber}: ${error}`);
      const scope = new Sentry.Scope();
      scope.setTag('blockNumber', blockNumber);
      Sentry.captureException(error, scope);
    }
}

async function testInsertBlock() {
  let api = await utils.api.apiProvider();
  let block_number = 114921;
  await processBlock(api, block_number, true);
  // await updateFinalized(11112);

  process.exit(0)
}

testInsertBlock()

