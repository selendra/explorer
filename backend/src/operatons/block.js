const utils = require('../utils');
const constants = require('../config');

const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

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

async function processEvent(api, blockNumber){
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

      // // call collection
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
      
    } catch (error) {
      // const scope = new Sentry.Scope();
      // scope.setTag('blockNumber', blockNumber);
      // Sentry.captureException(error, scope);
      console.log("Error")
    }
}

async function testInsertBlock() {
  let api = await utils.api.apiProvider();
  let block_number = 11112;
  await processEvent(api, block_number);
  process.exit(0)
}

testInsertBlock()