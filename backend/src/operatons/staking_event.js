const Sentry = require("@sentry/node");
const { BigNumber } = require("bignumber.js");

const utils = require("../utils");
const logger = require("../utils/logger");
const { backendConfig } = require("../config");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

async function process_staking_reward(
  client,
  event,
  eventIndex,
  phase,
  blockNumber,
  IndexedBlockEvents,
  IndexedBlockExtrinsics,
  timestamp
) {
  if (
    event.section === "staking" &&
    (event.method === "Reward" || event.method === "Rewarded")
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
        section === "staking" &&
        method === "payoutStakers"
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
          extrinsic.method.section === "utility" &&
          (extrinsic.method.method === "batch" ||
            extrinsic.method.method === "batchAll")
      ).map(([index]) => index);

      if (utilityBatchExtrinsicIndexes.length > 0) {
        // We know that utility.batch has some staking.payoutStakers extrinsic
        // Then we need to do a lookup of the previous staking.payoutStarted
        // event to get validator and era
        const payoutStartedEvents = IndexedBlockEvents.filter(
          ([, record]) =>
            record.phase.isApplyExtrinsic &&
            utilityBatchExtrinsicIndexes.includes(
              record.phase.asApplyExtrinsic.toNumber()
            ) && // events should be related to utility.batch extrinsic
            record.event.section === "staking" &&
            record.event.method === "PayoutStarted"
        ).reverse();
        if (payoutStartedEvents) {
          const payoutStartedEvent = payoutStartedEvents.find(
            ([index]) => index < eventIndex
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
            extrinsic.method.section === "proxy" &&
            extrinsic.method.method === "proxy"
        ).map(([index]) => index);

        if (proxyProxyExtrinsicIndexes.length > 0) {
          // We know that proxy.proxy has some staking.payoutStakers extrinsic
          // Then we need to do a lookup of the previous staking.payoutStarted
          // event to get validator and era
          const payoutStartedEvents = IndexedBlockEvents.filter(
            ([, record]) =>
              record.phase.isApplyExtrinsic &&
              proxyProxyExtrinsicIndexes.includes(
                record.phase.asApplyExtrinsic.toNumber()
              ) && // events should be related to proxy.proxy extrinsic
              record.event.section === "staking" &&
              record.event.method === "PayoutStarted"
          ).reverse();
          if (payoutStartedEvents) {
            const payoutStartedEvent = payoutStartedEvents.find(
              ([index]) => index < eventIndex
            );
            if (payoutStartedEvent) {
              [era, validator] = payoutStartedEvent[1].event.data;
            }
          }
        }
      }
    }

    const query = { blockNumber: blockNumber, eventIndex: eventIndex };
    const options = { upsert: true };
    let data = {};

    if (validator && era) {
      data = {
        $set: {
          blockNumber,
          eventIndex,
          accountId: event.data[0].toString(),
          validatorStashAddress: validator.toString(),
          era: era.toNumber(),
          amount: new BigNumber(event.data[1].toString())
            .dividedBy(1e18)
            .toNumber(),
          timestamp,
        },
      };
    } else {
      data = {
        $set: {
          blockNumber,
          eventIndex,
          accountId: event.data[0].toString(),
          validatorStashAddress: "",
          era: 0,
          amount: new BigNumber(event.data[1].toString())
            .dividedBy(1e18)
            .toNumber(),
          timestamp,
        },
      };
    }
    try {
      const stakingCol = await utils.db.getStakinRewardColCollection(client);
      await stakingCol.updateOne(query, data, options);

      logger.debug(
        `Added staking reward #${blockNumber}-${eventIndex} ${event.section} ➡ ${event.method}`
      );
    } catch (error) {
      logger.error(
        `Error adding staking reward #${blockNumber}-${eventIndex}: ${error}`
      );
      const scope = new Sentry.Scope();
      scope.setTag("staking", blockNumber);
      Sentry.captureException(error, scope);
    }
  }
}

async function process_staking_slash(
  client,
  event,
  eventIndex,
  activeEra,
  blockNumber,
  IndexedBlockEvents,
  timestamp
) {
  // Store validator staking slash
  if (
    event.section === "staking" &&
    (event.method === "Slash" || event.method === "Slashed")
  ) {
    data = {
      $set: {
        blockNumber,
        eventIndex,
        stakingStatus: "validator",
        accountId: event.data[0].toString(),
        validatorStashAddress: event.data[0].toString(),
        era: activeEra - 1,
        amount: new BigNumber(event.data[1].toString())
          .dividedBy(1e18)
          .toNumber(),
        timestamp,
      },
    };
    const query = {
      blockNumber: blockNumber,
      eventIndex: eventIndex,
    };
    const options = { upsert: true };

    try {
      let slashCol = await utils.db.getStakingSlashColCollection(client);
      await slashCol.updateOne(query, data, options);

      logger.debug(
        `Added validator staking slash #${blockNumber}-${eventIndex} ${event.section} ➡ ${event.method}`
      );
    } catch (error) {
      logger.error(
        `Error adding validator staking slash #${blockNumber}-${eventIndex}: ${error}`
      );
      scope.setTag("staking", blockNumber);
      Sentry.captureException(error);
    }
  }

  // Store nominator staking slash
  if (
    event.section === "balances" &&
    (event.method === "Slash" || event.method === "Slashed")
  ) {
    const validatorStashAddress = getSlashedValidatorAccount(
      eventIndex,
      IndexedBlockEvents
    );

    data = {
      $set: {
        blockNumber,
        eventIndex,
        stakingStatus: "nominator",
        accountId: event.data[0].toString(),
        validatorStashAddress,
        era: activeEra - 1,
        amount: new BigNumber(event.data[1].toString())
          .dividedBy(1e18)
          .toNumber(),
        timestamp,
      },
    };
    const query = {
      blockNumber: blockNumber,
      eventIndex: eventIndex,
    };

    try {
      let slashCol = await utils.db.getStakingSlashColCollection(client);
      await slashCol.updateOne(query, data, options);

      Sentry.captureMessage(
        `validator with address have been slash ${validatorStashAddress} inculde nominator`
      );

      logger.debug(
        `Added nominator staking slash #${blockNumber}-${eventIndex} ${event.section} ➡ ${event.method}`
      );
    } catch (error) {
      logger.error(
        `Error adding nominator staking slash #${blockNumber}-${eventIndex}: ${error}}`
      );
      const scope = new Sentry.Scope();
      scope.setTag("staking", blockNumber);
      Sentry.captureException(error, scope);
    }
  }
}

async function process_tmp_slash() {
  const client = await utils.db.mongodbConnect();
  data = {
    blockNumber: 0,
    eventIndex: 0,
    stakingStatus: "validator",
    accountId: "",
    validatorStashAddress: "",
    era: 0,
    amount: 0,
    timestamp: 0,
  };

  let slashCol = await utils.db.getStakingSlashColCollection(client);
  await slashCol.insertOne(data);
}

module.exports = {
  process_staking_reward,
  process_staking_slash,
};
