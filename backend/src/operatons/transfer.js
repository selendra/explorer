const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

const utils = require('../utils');
const logger = require('../utils/logger');
const { backendConfig } = require('../config');

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

async function getTransferAllAmount(blockNumber, index, blockEvents){
    try {
      return blockEvents
        .find(
          ({ event, phase }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index) &&
            event.section === 'balances' &&
            event.method === 'Transfer',
        )
        .event.data[2].toString();
    } catch (error) {
      const scope = new Sentry.Scope();
      scope.setTag('blockNumber', blockNumber);
      Sentry.captureException(error, scope);
    }
};

async function processTransfer(
    client,
    blockNumber,
    extrinsicIndex,
    blockEvents,
    section,
    method,
    args,
    hash,
    signer,
    feeInfo,
    success,
    errorMessage,
    timestamp
){
    // Store transfer
    const source = signer;
    let destination = '';

    if (JSON.parse(args)[0].id) {
        destination = JSON.parse(args)[0].id;
      } else if (JSON.parse(args)[0].address20) {
        destination = JSON.parse(args)[0].address20;
      } else {
        destination = JSON.parse(args)[0];
    }
    
    let amount;
    if (method === 'transferAll' && success) {
    // Equal source and destination addres doesn't trigger a balances.Transfer event
    amount =
        source === destination
        ? 0
        : getTransferAllAmount(blockNumber, extrinsicIndex, blockEvents);
    } else if (method === 'transferAll' && !success) {
    // no event is emitted so we can't get amount
        amount = 0;
    } else if (method === 'forceTransfer') {
        amount = JSON.parse(args)[2];
    } else {
        amount = JSON.parse(args)[1]; // 'transfer' and 'transferKeepAlive' methods
    }
    
    // fee calculation not supported for some runtimes
    const feeAmount = !!feeInfo
        ? new BigNumber(JSON.stringify(feeInfo.toJSON().partialFee)).dividedBy(1e18).toNumber()
        : null;

    const data = {
      $set: { 
        blockNumber,
        extrinsicIndex,
        section,
        method,
        hash,
        source,
        destination,
        amount: new BigNumber(amount).dividedBy(1e18).toNumber(),
        feeAmount,
        success,
        errorMessage,
        timestamp,
      }
    };

    const query = { blockNumber: blockNumber, hash: hash };
    const options = { upsert: true };

    try {
        const transferCol = await utils.db.getTransferColCollection(client);
        await transferCol.updateOne(query, data, options);

        logger.debug(
          `Added transfer ${blockNumber}-${extrinsicIndex} (${utils.shortHash(
            hash.toString(),
          )}) ${section} ➡ ${method}`,
        );
    } catch (error) {
      logger.error(`Error adding transfer ${blockNumber}-${extrinsicIndex}: ${JSON.stringify(error)}`);
      const scope = new Sentry.Scope();
      scope.setTag('transfer', blockNumber);
      Sentry.captureException(error, scope);
    }
}

module.exports = {
    processTransfer
}