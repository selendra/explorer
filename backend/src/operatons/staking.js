const Sentry = require('@sentry/node');
const { BigNumber } = require('bignumber.js');

const utils = require('../utils');
const logger = require('../utils/logger');
const constants = require('../config');

Sentry.init({
    dsn: constants.SENTRY,
    tracesSampleRate: 1.0,
});

async function process_staking_reward(
    event,
    eventIndex,
    phase,
    blockNumber,
    IndexedBlockEvents,
    IndexedBlockExtrinsics,
    timestamp,
){
    if (
        event.section === 'staking' &&
        (event.method === 'Reward' || event.method === 'Rewarded')
      ) {
        // Store validator stash address and era index
        let validator = null;
        let era = null;
    
        const payoutStakersExtrinsic = IndexedBlockExtrinsics.find(
          ([
            extrinsicIndex,
            {
              method: { section, method },
            },
          ]) =>
            phase.asApplyExtrinsic.eq(extrinsicIndex) && // event phase
            section === 'staking' &&
            method === 'payoutStakers',
        );
    
        if (payoutStakersExtrinsic) {
          validator = payoutStakersExtrinsic[1].method.args[0];
          era = payoutStakersExtrinsic[1].method.args[1];
        } else {
          // TODO: support era/validator extraction for staking.payoutValidator and staking.payoutNominator

          // staking.payoutStakers extrinsic included in a utility.batch or utility.batchAll extrinsic
          const utilityBatchExtrinsicIndexes = IndexedBlockExtrinsics.filter(
            ([extrinsicIndex, extrinsic]) =>
              phase.asApplyExtrinsic.eq(extrinsicIndex) && // event phase
              extrinsic.method.section === 'utility' &&
              (extrinsic.method.method === 'batch' ||
                extrinsic.method.method === 'batchAll'),
          ).map(([index]) => index);
    
          if (utilityBatchExtrinsicIndexes.length > 0) {
            // We know that utility.batch has some staking.payoutStakers extrinsic
            // Then we need to do a lookup of the previous staking.payoutStarted
            // event to get validator and era
            const payoutStartedEvents = IndexedBlockEvents.filter(
              ([, record]) =>
                record.phase.isApplyExtrinsic &&
                utilityBatchExtrinsicIndexes.includes(
                  record.phase.asApplyExtrinsic.toNumber(),
                ) && // events should be related to utility.batch extrinsic
                record.event.section === 'staking' &&
                record.event.method === 'PayoutStarted',
            ).reverse();
            if (payoutStartedEvents) {
              const payoutStartedEvent = payoutStartedEvents.find(
                ([index]) => index < eventIndex,
              );
              if (payoutStartedEvent) {
                [era, validator] = payoutStartedEvent[1].event.data;
              }
            }
          } else {
            //
            // staking.payoutStakers extrinsic included in a proxy.proxy extrinsic
            //
            const proxyProxyExtrinsicIndexes = IndexedBlockExtrinsics.filter(
              ([extrinsicIndex, extrinsic]) =>
                phase.asApplyExtrinsic.eq(extrinsicIndex) && // event phase
                extrinsic.method.section === 'proxy' &&
                extrinsic.method.method === 'proxy',
            ).map(([index]) => index);
    
            if (proxyProxyExtrinsicIndexes.length > 0) {
              // We know that proxy.proxy has some staking.payoutStakers extrinsic
              // Then we need to do a lookup of the previous staking.payoutStarted
              // event to get validator and era
              const payoutStartedEvents = IndexedBlockEvents.filter(
                ([, record]) =>
                  record.phase.isApplyExtrinsic &&
                  proxyProxyExtrinsicIndexes.includes(
                    record.phase.asApplyExtrinsic.toNumber(),
                  ) && // events should be related to proxy.proxy extrinsic
                  record.event.section === 'staking' &&
                  record.event.method === 'PayoutStarted',
              ).reverse();
              if (payoutStartedEvents) {
                const payoutStartedEvent = payoutStartedEvents.find(
                  ([index]) => index < eventIndex,
                );
                if (payoutStartedEvent) {
                  [era, validator] = payoutStartedEvent[1].event.data;
                }
              }
            }
          }
        }

        let data = {};
    
        if (validator && era) {
          data = {
            blockNumber,
            eventIndex,
            accountId: event.data[0].toString(),
            validatorStashAddress: validator.toString(),
            era: era.toNumber(),
            amount: new BigNumber(event.data[1].toString()).dividedBy(1e18).toNumber(),
            timestamp,
          };
        } else {
          data = {
            blockNumber,
            eventIndex,
            accountId: event.data[0].toString(),
            amount: new BigNumber(event.data[1].toString()).dividedBy(1e18).toNumber(),
            timestamp,
          };
        }
        try {
          let stakingCol = await utils.db.getStakinRewardColCollection();
          await stakingCol.insertOne(data);
     
          logger.info(
            `Added staking reward #${blockNumber}-${eventIndex} ${event.section} ➡ ${event.method}`,
          );
        } catch (error) {
          logger.error(
            `Error adding staking reward #${blockNumber}-${eventIndex}: ${error}`,
          );
          const scope = new Sentry.Scope();
          scope.setTag('blockNumber', blockNumber);
          Sentry.captureException(error, scope);
        }
    }
}

module.exports = {
    process_staking_reward
}