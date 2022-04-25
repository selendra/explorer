const Sentry = require("@sentry/node");
const { BigNumber } = require("bignumber.js");

const utils = require("../utils");
const logger = require("../utils/logger");
const { backendConfig } = require("../config");

const { updateAccountsInfo } = require("./account");
const { processEvents } = require("./event");
const { processExtrinsics } = require("./extrinsic");
const { storeMetadata } = require("./runtime");
const { processLogs } = require("./log");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

function getDisplayName(identity) {
  if (
    identity.displayParent &&
    identity.displayParent !== "" &&
    identity.display &&
    identity.display !== ""
  ) {
    return `${identity.displayParent} / ${identity.display}`;
  }
  return identity.display || "";
}

async function updateFinalizedBlock(client, api, finalizedBlock) {
  const blockHash = await api.rpc.chain.getBlockHash(finalizedBlock);
  const extendedHeader = await api.derive.chain.getHeader(blockHash);
  const { parentHash, extrinsicsRoot, stateRoot } = extendedHeader;
  const blockAuthorIdentity = await api.derive.accounts.info(
    extendedHeader.author
  );
  const blockAuthorName = getDisplayName(blockAuthorIdentity.identity);

  const blockQuery = { blockNumber: finalizedBlock };
  const update = {
    $set: {
      blockNumber: finalizedBlock,
      blockAuthor: extendedHeader.author.toString(),
      blockAuthorName,
      blockHash: blockHash.toString(),
      parentHash: parentHash.toString(),
      extrinsicsRoot: extrinsicsRoot.toString(),
      stateRoot: stateRoot.toString(),
      finalized: true,
    },
  };

  try {
    const blockCol = await utils.db.getBlockCollection(client);
    await blockCol.findOneAndUpdate(blockQuery, update);
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function harvestBlock(
  client,
  api,
  blockNumber,
  finalizedBlock,
  doUpdateAccountsInfo
) {
  const startTime = new Date().getTime();
  try {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const apiAt = await api.at(blockHash);

    const [derivedBlock, total, runtimeVersion, activeEra, currentIndex] =
      await Promise.all([
        api.derive.chain.getBlock(blockHash),
        apiAt.query.balances.totalIssuance(),
        api.rpc.state.getRuntimeVersion(blockHash),
        apiAt.query?.staking.activeEra
          ? apiAt.query.staking.activeEra().then((res) => res.unwrap().index)
          : 0,
        apiAt.query.session.currentIndex(),
      ]);

    const { block, author, events } = derivedBlock;
    const blockAuthor = author ? utils.ss58.ss58Format(author.toString()) : ""; // genesis block doesn't have author
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
                  section === "timestamp" && method === "set"
              )
              .args[0].toString(),
            10
          )
        : 0;

    // Totals
    const totalEvents = events.length;
    const totalExtrinsics = block.extrinsics.length;
    let totalIssuance = new BigNumber(total)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();

    const query = { blockNumber: blockNumber };
    const options = { upsert: true };
    const data = {
      $set: {
        blockNumber,
        finalized: finalizedBlock,
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
      },
    };

    try {
      const blockCol = await utils.db.getBlockCollection(client);
      await blockCol.updateOne(query, data, options);

      const endTime = new Date().getTime();
      logger.info(
        `Added block #${blockNumber} in ${(endTime - startTime) / 1000}s`
      );
    } catch (error) {
      logger.error(`Error adding block #${blockNumber}: ${error}`);
      const scope = new Sentry.Scope();
      scope.setTag("blockNumber", blockNumber);
      Sentry.captureException(error, scope);
    }

    //Runtime upgrade
    const runtimeUpgrade = events.find(
      ({ event: { section, method } }) =>
        section === "system" && method === "CodeUpdated"
    );

    if (runtimeUpgrade) {
      const specName = runtimeVersion.toJSON().specName;
      const specVersion = runtimeVersion.specVersion;
      await storeMetadata(
        client,
        api,
        blockNumber,
        blockHash,
        specName,
        specVersion,
        timestamp
      );
    }

    await Promise.all([
      // Store block extrinsics
      processExtrinsics(
        client,
        api,
        apiAt,
        blockNumber,
        blockHash,
        block.extrinsics,
        events,
        timestamp
      ),

      // Store module events
      processEvents(
        client,
        blockNumber,
        parseInt(activeEra.toString()),
        events,
        block.extrinsics,
        timestamp
      ),

      // Store block logs
      processLogs(client, blockNumber, block.header.digest.logs, timestamp),

      doUpdateAccountsInfo
        ? await updateAccountsInfo(client, api, blockNumber, timestamp, events)
        : false,
    ]);
  } catch (error) {
    logger.error(`Error adding block #${blockNumber}: ${error}`);
    const scope = new Sentry.Scope();
    scope.setTag("blockNumber", blockNumber);
    Sentry.captureException(error, scope);
  }
}

async function harvestBlocks(client, config, api, startBlock, endBlock) {
  const blocks = utils.range(startBlock, endBlock, 1);

  const chunks = utils.chunker(blocks, config.chunkSize);
  logger.info(`Processing chunks of ${config.chunkSize} blocks`);

  const chunkProcessingTimes = [];
  let maxTimeMs = 0;
  let minTimeMs = 1000000;
  let avgTimeMs = 0;
  let avgBlocksPerSecond = 0;

  // dont update accounts info for addresses found on block events data
  const doUpdateAccountsInfo = false;
  const finalizedBlock = true;

  for (const chunk of chunks) {
    const chunkStartTime = Date.now();

    await Promise.all(
      chunk.map((blockNumber) =>
        harvestBlock(
          client,
          api,
          blockNumber,
          finalizedBlock,
          doUpdateAccountsInfo
        )
      )
    );
    const chunkEndTime = new Date().getTime();

    // Cook some stats
    const chunkProcessingTimeMs = chunkEndTime - chunkStartTime;
    if (chunkProcessingTimeMs < minTimeMs) {
      minTimeMs = chunkProcessingTimeMs;
    }
    if (chunkProcessingTimeMs > maxTimeMs) {
      maxTimeMs = chunkProcessingTimeMs;
    }
    chunkProcessingTimes.push(chunkProcessingTimeMs);
    avgTimeMs =
      chunkProcessingTimes.reduce(
        (sum, chunkProcessingTime) => sum + chunkProcessingTime,
        0
      ) / chunkProcessingTimes.length;
    avgBlocksPerSecond = 1 / (avgTimeMs / 1000 / config.chunkSize);
    const currentBlocksPerSecond =
      1 / (chunkProcessingTimeMs / 1000 / config.chunkSize);
    const completed = ((chunks.indexOf(chunk) + 1) * 100) / chunks.length;

    logger.info(
      `Processed chunk ${chunks.indexOf(chunk) + 1}/${
        chunks.length
      } [${completed.toFixed(2)}%] ` +
        `in ${(chunkProcessingTimeMs / 1000).toFixed(2)}s ` +
        `min/max/avg: ${(minTimeMs / 1000).toFixed(2)}/${(
          maxTimeMs / 1000
        ).toFixed(2)}/${(avgTimeMs / 1000).toFixed(2)} ` +
        `cur/avg bps: ${currentBlocksPerSecond.toFixed(
          2
        )}/${avgBlocksPerSecond.toFixed(2)}`
    );
  }
}

async function harvestBlocksSeq(client, api, startBlock, endBlock) {
  const blocks = utils.range(startBlock, endBlock, 1);
  const blockProcessingTimes = [];
  let maxTimeMs = 0;
  let minTimeMs = 1000000;
  let avgTimeMs = 0;

  // dont update accounts info for addresses found on block events data
  const doUpdateAccountsInfo = false;
  const finalizedBlock = true;

  for (const blockNumber of blocks) {
    const blockStartTime = Date.now();
    await harvestBlock(
      client,
      api,
      blockNumber,
      finalizedBlock,
      doUpdateAccountsInfo
    );
    const blockEndTime = new Date().getTime();

    // Cook some stats
    const blockProcessingTimeMs = blockEndTime - blockStartTime;
    if (blockProcessingTimeMs < minTimeMs) {
      minTimeMs = blockProcessingTimeMs;
    }
    if (blockProcessingTimeMs > maxTimeMs) {
      maxTimeMs = blockProcessingTimeMs;
    }
    blockProcessingTimes.push(blockProcessingTimeMs);
    avgTimeMs =
      blockProcessingTimes.reduce(
        (sum, blockProcessingTime) => sum + blockProcessingTime,
        0
      ) / blockProcessingTimes.length;
    const completed = ((blocks.indexOf(blockNumber) + 1) * 100) / blocks.length;

    logger.info(
      `Processed block #${blockNumber} ${blocks.indexOf(blockNumber) + 1}/${
        blocks.length
      } [${completed.toFixed(2)}%] in ${(blockProcessingTimeMs / 1000).toFixed(
        2
      )}s min/max/avg: ${(minTimeMs / 1000).toFixed(2)}/${(
        maxTimeMs / 1000
      ).toFixed(2)}/${(avgTimeMs / 1000).toFixed(2)}`
    );
  }
}

module.exports = {
  harvestBlocks,
  harvestBlock,
  harvestBlocksSeq,
  storeMetadata,
  updateFinalizedBlock,
};
