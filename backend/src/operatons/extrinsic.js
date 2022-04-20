const Sentry = require("@sentry/node");

const utils = require("../utils");
const logger = require("../utils/logger");
const { backendConfig } = require("../config");
const { processTransfer } = require("./transfer");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

// extrinsics chunk size
const chunkSize = 20;

function getExtrinsicSuccessOrErrorMessage(
  apiAt,
  index,
  blockEvents,
  blockNumber
) {
  let extrinsicSuccess = false;
  let extrinsicErrorMessage = "";
  blockEvents
    .filter(
      ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
    )
    .forEach(({ event }) => {
      if (apiAt.events.system.ExtrinsicSuccess.is(event)) {
        extrinsicSuccess = true;
      } else if (apiAt.events.system.ExtrinsicFailed.is(event)) {
        const [dispatchError] = event.data;
        if (dispatchError.isModule) {
          let decoded;
          try {
            decoded = apiAt.registry.findMetaError(dispatchError.asModule);
            extrinsicErrorMessage = `${decoded.name}: ${decoded.docs}`;
          } catch (error) {
            const scope = new Sentry.Scope();
            scope.setTag("blockNumber", blockNumber);
            Sentry.captureException(error, scope);
          }
        } else {
          extrinsicErrorMessage = dispatchError.toString();
        }
      }
    });
  return [extrinsicSuccess, extrinsicErrorMessage];
}

async function getExtrinsicFeeInfo(api, hexExtrinsic, blockHash) {
  try {
    const feeInfo = await api.rpc.payment.queryInfo(hexExtrinsic, blockHash);
    return feeInfo;
  } catch (error) {
    logger.info(`Error getting extrinsic fee info: ${error}`);
  }
  return null;
}

async function getExtrinsicFeeDetails(api, hexExtrinsic, blockHash) {
  try {
    const feeDetails = await api.rpc.payment.queryFeeDetails(
      hexExtrinsic,
      blockHash
    );
    return feeDetails;
  } catch (error) {
    logger.info(`Error getting extrinsic fee details: ${error}`);
  }
  return null;
}

async function processExtrinsic(
  client,
  api,
  apiAt,
  blockNumber,
  blockHash,
  indexedExtrinsic,
  blockEvents,
  timestamp
) {
  const [extrinsicIndex, extrinsic] = indexedExtrinsic;
  const { isSigned } = extrinsic;
  const signer = isSigned
    ? utils.ss58.ss58Format(extrinsic.signer.toString())
    : "";

  const section = extrinsic.method.section;
  const method = extrinsic.method.method;
  const args = JSON.stringify(extrinsic.method.args);
  const argsDef = JSON.stringify(extrinsic.argsDef);
  const hash = extrinsic.hash.toHex();
  const doc = JSON.stringify(extrinsic.meta.docs.toJSON());
  const [success, errorMessage] = getExtrinsicSuccessOrErrorMessage(
    apiAt,
    extrinsicIndex,
    blockEvents,
    blockNumber
  );

  let feeInfo = null;
  let feeDetails = null;
  if (isSigned) {
    feeInfo = await getExtrinsicFeeInfo(api, extrinsic.toHex(), blockHash);
    feeDetails = await getExtrinsicFeeDetails(
      api,
      extrinsic.toHex(),
      blockHash
    );
  }

  let iFeeInfo = !!feeInfo ? JSON.stringify(feeInfo.toJSON()) : null;
  let iFeeDetails = (feeDetails = !!feeDetails
    ? JSON.stringify(feeDetails.toJSON())
    : null);

  const query = { blockNumber: blockNumber, hash: hash };
  const options = { upsert: true };
  const data = {
    $set: {
      blockNumber,
      extrinsicIndex,
      isSigned,
      signer,
      section,
      method,
      args,
      argsDef,
      hash,
      doc,
      feeInfo: iFeeInfo,
      feeDetails: iFeeDetails,
      success,
      errorMessage,
      timestamp,
    },
  };

  try {
    const extrinsicCol = await utils.db.getExtrinsicCollection(client);
    await extrinsicCol.updateOne(query, data, options);
    logger.debug(
      `Added extrinsic ${blockNumber}-${extrinsicIndex} (${utils.shortHash(
        hash
      )}) ${section} ➡ ${method}`
    );
  } catch (error) {
    logger.error(
      `Error adding extrinsic ${blockNumber}-${extrinsicIndex}: ${JSON.stringify(
        error
      )}`
    );
    const scope = new Sentry.Scope();
    scope.setTag("blockNumber", blockNumber);
    Sentry.captureException(error, scope);
  }

  if (isSigned) {
    try {
      const extrinsicCol = await utils.db.getSignedExtrinsicCol(client);
      await extrinsicCol.updateOne(query, data, options);
      logger.debug(
        `Added signed extrinsic ${blockNumber}-${extrinsicIndex} (${utils.shortHash(
          hash
        )}) ${section} ➡ ${method}`
      );
    } catch (error) {
      logger.error(
        `Error adding signed extrinsic ${blockNumber}-${extrinsicIndex}: ${JSON.stringify(
          error
        )}`
      );
      const scope = new Sentry.Scope();
      scope.setTag("blockNumber", blockNumber);
      Sentry.captureException(error, scope);
    }
  }

  if (
    section === "balances" &&
    (method === "forceTransfer" ||
      method === "transfer" ||
      method === "transferAll" ||
      method === "transferKeepAlive")
  ) {
    // Store transfer
    await processTransfer(
      client,
      blockNumber,
      extrinsicIndex,
      blockEvents,
      section,
      method,
      args,
      hash.toString(),
      signer,
      feeInfo,
      success,
      errorMessage,
      timestamp
    );
  }
}

async function processExtrinsics(
  client,
  api,
  apiAt,
  blockNumber,
  blockHash,
  extrinsics,
  blockEvents,
  timestamp
) {
  const startTime = new Date().getTime();
  const indexedExtrinsics = extrinsics.map((extrinsic, index) => [
    index,
    extrinsic,
  ]);

  const chunks = utils.chunker(indexedExtrinsics, chunkSize);
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((indexedExtrinsic) =>
        processExtrinsic(
          client,
          api,
          apiAt,
          blockNumber,
          blockHash,
          indexedExtrinsic,
          blockEvents,
          timestamp
        )
      )
    );
  }
  // Log execution time
  const endTime = new Date().getTime();
  logger.info(
    `Added ${extrinsics.length} extrinsics in ${(
      (endTime - startTime) /
      1000
    ).toFixed(3)}s`
  );
}

module.exports = {
  processExtrinsic,
  processExtrinsics,
};
