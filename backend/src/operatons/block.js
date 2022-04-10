const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

const utils = require('../utils');
const logger = require('../utils/logger');
const constants = require('../config');
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

async function processBlock(api, blockNumber){
  const startTime = new Date().getTime();
    try {
      const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
      const finalized = false;

      const derivedBlock = await api.derive.chain.getBlock(blockHash);
      const { block, author, events } = derivedBlock;
      
      const { parentHash, extrinsicsRoot, stateRoot } = block.header;

      // genesis block doesn't have author
      const blockAuthor = author ? author.toString() : '';
      const blockAuthorIdentity = await api.derive.accounts.info(blockAuthor);
      const blockAuthorName = getDisplayName(blockAuthorIdentity.identity);

      const total = await api.query.balances.totalIssuance();
      let totalIssuance = new BigNumber(total).dividedBy(1e18).toNumber();

      const runtimeVersion = await api.rpc.state.getRuntimeVersion(blockHash);

      const activeEra = 
          await api.query.staking.activeEra() ? 
          await api.query.staking.activeEra().then((res) => res.unwrap().index)
          : 0;

      const currentIndex = await api.query.session.currentIndex();

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

      try {
        const blockCol = await utils.db.getBlockCollection();
        await blockCol.insertOne({
            blockNumber,
            finalized,
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

    await updateAccountsInfo(api, blockNumber, timestamp, events);

    } catch (error) {
      logger.error(`Error adding block #${blockNumber}: ${error}`);
      const scope = new Sentry.Scope();
      scope.setTag('blockNumber', blockNumber);
      Sentry.captureException(error, scope);
    }
}

async function testInsertBlock() {
  let api = await utils.api.apiProvider();
  let block_number = 961110;
  await processBlock(api, block_number);
  // await updateFinalized(11112);

  // await storeMetadata(api, block_number);
  process.exit(0)
}

testInsertBlock()