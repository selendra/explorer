const utils = require('../utils');

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
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const finalized = false;

    const derivedBlock = await api.derive.chain.getBlock(blockHash);
    const { block, author, events } = derivedBlock;
    
    const { parentHash, extrinsicsRoot, stateRoot } = block.header;

    // genesis block doesn't have author
    const blockAuthor = author ? author.toString() : '';
    const blockAuthorIdentity = await api.derive.accounts.info(blockAuthor);
    const blockAuthorName = getDisplayName(blockAuthorIdentity.identity);

    const totalIssuance = await api.query.balances.totalIssuance();

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
        activeEra: activeEra.toHuman(),
        currentIndex: currentIndex.toHuman(),
        runtimeVersion: runtimeVersion.toHuman().specVersion,
        totalEvents: totalEvents,
        totalExtrinsics: totalExtrinsics,
        totalIssuance: totalIssuance.toHuman(),
        timestamp,
      })
}

processEvent()