const Sentry = require("@sentry/node");
const { BigNumber } = require("bignumber.js");

const { backendConfig } = require("../config");
const utils = require("../utils");
const logger = require("../utils/logger");
const {
  insertEraValidatorStats,
  getAddressCreation,
  parseIdentity,
  getClusterInfo,
  getCommissionHistory,
  getCommissionRating,
  getPayoutRating,
  insertEraValidatorStatsAvg,
  getLastEraInDb,
  insertRankingValidator,
  removeRanking,
  addNewFeaturedValidator,
} = require("../operations/staking");
const {
  removeEraValidatorStats,
  removeEraValidatorAvgStats,
} = require("../operations/staking_rm");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

const config = backendConfig.crawlers.find(({ name }) => name === "ranking");

async function crawler(delayedStart) {
  if (delayedStart) {
    logger.info(
      `Delaying ranking crawler start for ${config.startDelay / 1000}s`
    );
    await utils.wait(config.startDelay);
  }

  logger.info("Starting staking ranking crawler...");
  const startTime = new Date().getTime();

  const api = await utils.api.getAPI();
  const client = await utils.db.mongodbConnect();

  let synced = await utils.api.isNodeSynced(api);
  while (!synced) {
    await utils.wait(10000);
    synced = await utils.api.isNodeSynced(api);
  }

  const clusters = [];
  const stakingQueryFlags = {
    withDestination: false,
    withExposure: true,
    withLedger: true,
    withNominations: false,
    withPrefs: true,
  };
  const minMaxEraPerformance = [];
  const participateInGovernance = [];
  let validators = [];
  let intentions = [];
  let maxPerformance = 0;
  let minPerformance = 0;

  //
  // data collection
  //

  try {
    const lastEraInDb = await getLastEraInDb(client);
    logger.debug(`Last era in DB is ${lastEraInDb}`);

    // chain data
    logger.debug("Fetching chain data ...");
    const withActive = false;

    logger.debug("Step #1");
    const [erasHistoric, chainCurrentEra, chainActiveEra] = await Promise.all([
      api.derive.staking.erasHistoric(withActive),
      api.query.staking.currentEra(),
      api.query.staking.activeEra(),
    ]);

    const eraIndexes = erasHistoric.slice(
      Math.max(erasHistoric.length - config.historySize, 0)
    );
    const { maxNominatorRewardedPerValidator } = api.consts.staking;

    logger.debug("Step #2");
    const [
      { block },
      validatorAddresses,
      waitingInfo,
      nominators,
      councilVotes,
      proposals,
      referendums,
    ] = await Promise.all([
      api.rpc.chain.getBlock(),
      api.query.session.validators(),
      api.derive.staking.waitingInfo(stakingQueryFlags),
      api.query.staking.nominators.entries(),
      api.derive.council.votes(),
      api.derive.democracy.proposals(),
      api.derive.democracy.referendums(),
    ]);

    logger.debug("Step #3");
    const erasPoints = await api.derive.staking._erasPoints(
      eraIndexes,
      withActive
    );

    logger.debug("Step #4");
    let erasPreferences = [];
    for (const eraIndex of eraIndexes) {
      const eraPrefs = await api.derive.staking.eraPrefs(eraIndex);
      erasPreferences = erasPreferences.concat(eraPrefs);
    }

    logger.debug("Step #5");
    let erasSlashes = [];
    for (const eraIndex of eraIndexes) {
      const eraSlashes = await api.derive.staking.eraSlashes(eraIndex);
      erasSlashes = erasSlashes.concat(eraSlashes);
    }

    logger.debug("Step #6");
    let erasExposure = [];
    for (const eraIndex of eraIndexes) {
      const eraExposure = await api.derive.staking.eraExposure(eraIndex);
      erasExposure = erasExposure.concat(eraExposure);
    }

    logger.debug("Step #7");
    validators = await Promise.all(
      validatorAddresses.map((authorityId) =>
        api.derive.staking.query(authorityId, stakingQueryFlags)
      )
    );

    logger.debug("Step #8");
    validators = await Promise.all(
      validators.map((validator) =>
        api.derive.accounts.info(validator.accountId).then(({ identity }) => ({
          ...validator,
          identity,
          active: true,
        }))
      )
    );

    logger.debug("Step #9");
    intentions = await Promise.all(
      waitingInfo.info.map((intention) =>
        api.derive.accounts.info(intention.accountId).then(({ identity }) => ({
          ...intention,
          identity,
          active: false,
        }))
      )
    );

    const dataCollectionEndTime = new Date().getTime();
    const dataCollectionTime = dataCollectionEndTime - startTime;
    logger.debug("Done!");

    //
    // data processing
    //
    logger.debug("Processing data ...");
    const blockHeight = parseInt(block.header.number.toString(), 10);
    const numActiveValidators = validatorAddresses.length;
    const eraPointsHistoryTotals = [];
    erasPoints.forEach(({ eraPoints }) => {
      eraPointsHistoryTotals.push(parseInt(eraPoints.toString(), 10));
    });
    const eraPointsHistoryTotalsSum = eraPointsHistoryTotals.reduce(
      (total, num) => total + num,
      0
    );
    const eraPointsAverage = eraPointsHistoryTotalsSum / numActiveValidators;

    // dashboard metrics
    const activeValidatorCount = validatorAddresses.length;
    const waitingValidatorCount = waitingInfo.info.length;
    const nominatorCount = nominators.length;
    const currentEra = chainCurrentEra.toString();
    const activeEra = JSON.parse(JSON.stringify(chainActiveEra)).index;

    // minimun stake
    logger.debug("Finding minimum stake");
    const nominatorStakes = [];
    for (const validator of validators) {
      for (const nominatorStake of validator.exposure.others) {
        nominatorStakes.push(nominatorStake.value);
      }
    }
    nominatorStakes.sort((a, b) => (a.unwrap().lt(b.unwrap()) ? -1 : 1));
    let minimumStake = nominatorStakes[0];

    minimumStake = new BigNumber(minimumStake)
      .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
      .toNumber();

    logger.debug(`${activeValidatorCount} active validators`);
    logger.debug(`${waitingValidatorCount} waiting validators`);
    logger.debug(`${nominatorCount} nominators`);
    logger.debug(`Current era is ${currentEra}`);
    logger.debug(`Active era is ${activeEra}`);
    logger.debug(`Minimum amount to stake is ${minimumStake}`);

    const query = {};
    const update = {
      $set: {
        activeValidatorCount,
        waitingValidatorCount,
        nominatorCount,
        currentEra: parseInt(currentEra),
        activeEra,
        minimumStake,
      },
    };
    const options = { upsert: true };

    const validatorCol = await utils.db.getValidatorColCollection(client);
    await validatorCol.updateOne(query, update, options);

    const allNominations = nominators.map(([key, nominations]) => {
      const nominator = key.toHuman()[0];
      const targets = nominations.toJSON()["targets"];
      return {
        nominator,
        targets,
      };
    });

    proposals.forEach(({ seconds, proposer }) => {
      participateInGovernance.push(proposer.toString());
      seconds.forEach((accountId) =>
        participateInGovernance.push(accountId.toString())
      );
    });

    referendums.forEach(({ votes }) => {
      votes.forEach(({ accountId }) =>
        participateInGovernance.push(accountId.toString())
      );
    });

    // Merge validators and intentions
    validators = validators.concat(intentions);

    // stash & identity parent address creation block
    const stashAddressesCreation = [];
    for (const validator of validators) {
      const stashAddress = validator.stashId.toString();
      stashAddressesCreation[stashAddress] = await getAddressCreation(
        client,
        stashAddress
      );

      if (validator.identity.parent) {
        const stashParentAddress = validator.identity.parent.toString();
        stashAddressesCreation[stashParentAddress] = await getAddressCreation(
          client,
          stashParentAddress
        );
      }
    }

    let ranking = validators
      .map((validator) => {
        // active
        const { active } = validator;
        const activeRating = active ? 2 : 0;

        // stash
        const stashAddress = validator.stashId.toString();

        // address creation
        let addressCreationRating = 0;
        const stashCreatedAtBlock = parseInt(
          stashAddressesCreation[stashAddress],
          10
        );
        let stashParentCreatedAtBlock = 0;
        if (validator.identity.parent) {
          stashParentCreatedAtBlock = parseInt(
            stashAddressesCreation[validator.identity.parent.toString()],
            10
          );
          const best =
            stashParentCreatedAtBlock > stashCreatedAtBlock
              ? stashCreatedAtBlock
              : stashParentCreatedAtBlock;
          if (best <= blockHeight / 4) {
            addressCreationRating = 3;
          } else if (best <= (blockHeight / 4) * 2) {
            addressCreationRating = 2;
          } else if (best <= (blockHeight / 4) * 3) {
            addressCreationRating = 1;
          }
        } else if (stashCreatedAtBlock <= blockHeight / 4) {
          addressCreationRating = 3;
        } else if (stashCreatedAtBlock <= (blockHeight / 4) * 2) {
          addressCreationRating = 2;
        } else if (stashCreatedAtBlock <= (blockHeight / 4) * 3) {
          addressCreationRating = 1;
        }

        // controller
        const controllerAddress = validator.controllerId.toString();

        // identity
        const { verifiedIdentity, hasSubIdentity, name, identityRating } =
          parseIdentity(validator.identity);
        const identity = JSON.parse(JSON.stringify(validator.identity));

        // sub-accounts
        const { clusterMembers, clusterName } = getClusterInfo(
          hasSubIdentity,
          validators,
          validator.identity
        );
        if (clusterName && !clusters.includes(clusterName)) {
          clusters.push(clusterName);
        }
        const partOfCluster = clusterMembers > 1;
        const subAccountsRating = hasSubIdentity ? 2 : 0;

        // nominators
        const nominators = active
          ? validator.exposure.others.length
          : allNominations.filter((nomination) =>
              nomination.targets.some(
                (target) => target === validator.accountId.toString()
              )
            ).length;
        const nominatorsRating =
          nominators > 0 &&
          nominators <= maxNominatorRewardedPerValidator.toNumber()
            ? 2
            : 0;
        const nominations = active
          ? validator.exposure.others
          : allNominations.filter((nomination) =>
              nomination.targets.some(
                (target) => target === validator.accountId.toString()
              )
            );

        // slashes
        const slashes =
          erasSlashes.filter(
            ({ validators }) => validators[validator.accountId.toString()]
          ) || [];
        const slashed = slashes.length > 0;
        const slashRating = slashed ? 0 : 2;

        // commission
        const commission =
          parseInt(validator.validatorPrefs.commission.toString(), 10) /
          10000000;
        const commissionHistory = getCommissionHistory(
          validator.accountId,
          erasPreferences
        );
        const commissionRating = getCommissionRating(
          commission,
          commissionHistory
        );

        // governance
        const councilBacking = validator.identity?.parent
          ? councilVotes.some(
              (vote) => vote[0].toString() === validator.accountId.toString()
            ) ||
            councilVotes.some(
              (vote) =>
                vote[0].toString() === validator.identity.parent.toString()
            )
          : councilVotes.some(
              (vote) => vote[0].toString() === validator.accountId.toString()
            );
        const activeInGovernance = validator.identity?.parent
          ? participateInGovernance.includes(validator.accountId.toString()) ||
            participateInGovernance.includes(
              validator.identity.parent.toString()
            )
          : participateInGovernance.includes(validator.accountId.toString());
        let governanceRating = 0;
        if (councilBacking && activeInGovernance) {
          governanceRating = 3;
        } else if (councilBacking || activeInGovernance) {
          governanceRating = 2;
        }

        // era points and frecuency of payouts
        const eraPointsHistory = [];
        const payoutHistory = [];
        const performanceHistory = [];
        const stakeHistory = [];
        let activeEras = 0;
        let performance = 0;
        erasPoints.forEach((eraPoints) => {
          const { era } = eraPoints;
          let eraPayoutState = "inactive";
          let eraPerformance = 0;
          if (eraPoints.validators[stashAddress]) {
            activeEras += 1;
            const points = parseInt(
              eraPoints.validators[stashAddress].toString(),
              10
            );
            eraPointsHistory.push({
              era: new BigNumber(era.toString()).toString(10),
              points,
            });
            if (validator.stakingLedger.claimedRewards.includes(era)) {
              eraPayoutState = "paid";
            } else {
              eraPayoutState = "pending";
            }
            // era performance
            const eraTotalStake = new BigNumber(
              erasExposure.find(
                (eraExposure) => eraExposure.era === era
              ).validators[stashAddress].total
            );
            const eraSelfStake = new BigNumber(
              erasExposure.find(
                (eraExposure) => eraExposure.era === era
              ).validators[stashAddress].own
            );
            const eraOthersStake = eraTotalStake.minus(eraSelfStake);
            stakeHistory.push({
              era: new BigNumber(era.toString()).toString(10),
              self: eraSelfStake.toString(10),
              others: eraOthersStake.toString(10),
              total: eraTotalStake.toString(10),
            });
            eraPerformance =
              (points * (1 - commission / 100)) /
              eraTotalStake.div(new BigNumber(10).pow(18)).toNumber();
            performanceHistory.push({
              era: new BigNumber(era.toString()).toString(10),
              performance: eraPerformance,
            });
          } else {
            // validator was not active in that era
            eraPointsHistory.push({
              era: new BigNumber(era.toString()).toString(10),
              points: 0,
            });
            stakeHistory.push({
              era: new BigNumber(era.toString()).toString(10),
              self: 0,
              others: 0,
              total: 0,
            });
            performanceHistory.push({
              era: new BigNumber(era.toString()).toString(10),
              performance: 0,
            });
          }
          payoutHistory.push({
            era: new BigNumber(era.toString()).toString(10),
            status: eraPayoutState,
          });
          // total performance
          performance += eraPerformance;
        });
        const eraPointsHistoryValidator = eraPointsHistory.reduce(
          (total, era) => total + era.points,
          0
        );
        const eraPointsPercent =
          (eraPointsHistoryValidator * 100) / eraPointsHistoryTotalsSum;
        const eraPointsRating =
          eraPointsHistoryValidator > eraPointsAverage ? 2 : 0;
        const payoutRating = getPayoutRating(config, payoutHistory);

        // stake
        const selfStake = active
          ? new BigNumber(validator.exposure.own.toString())
          : new BigNumber(validator.stakingLedger.total.toString());
        const totalStake = active
          ? new BigNumber(validator.exposure.total.toString())
          : selfStake;
        const otherStake = active
          ? totalStake.minus(selfStake)
          : new BigNumber(0);

        // performance
        if (performance > maxPerformance) {
          maxPerformance = performance;
        }
        if (performance < minPerformance) {
          minPerformance = performance;
        }

        const showClusterMember = true;

        // VRC score
        const totalRating =
          activeRating +
          addressCreationRating +
          identityRating +
          subAccountsRating +
          nominatorsRating +
          commissionRating +
          eraPointsRating +
          slashRating +
          governanceRating +
          payoutRating;

        return {
          active,
          activeRating,
          name,
          identity,
          hasSubIdentity,
          subAccountsRating,
          verifiedIdentity,
          identityRating,
          stashAddress,
          stashCreatedAtBlock,
          stashParentCreatedAtBlock,
          addressCreationRating,
          controllerAddress,
          partOfCluster,
          clusterName,
          clusterMembers,
          showClusterMember,
          nominators,
          nominatorsRating,
          nominations,
          commission,
          commissionHistory,
          commissionRating,
          activeEras,
          eraPointsHistory,
          eraPointsPercent,
          eraPointsRating,
          performance,
          performanceHistory,
          slashed,
          slashRating,
          slashes,
          councilBacking,
          activeInGovernance,
          governanceRating,
          payoutHistory,
          payoutRating,
          selfStake,
          otherStake,
          totalStake,
          stakeHistory,
          totalRating,
        };
      })
      .sort((a, b) => (a.totalRating < b.totalRating ? 1 : -1))
      .map((validator, rank) => {
        const relativePerformance = (
          (validator.performance - minPerformance) /
          (maxPerformance - minPerformance)
        ).toFixed(6);
        const dominated = false;
        const relativePerformanceHistory = [];
        return {
          rank: rank + 1,
          relativePerformance,
          relativePerformanceHistory,
          ...validator,
          dominated,
        };
      });

    // populate minMaxEraPerformance
    eraIndexes.forEach((eraIndex) => {
      const era = new BigNumber(eraIndex.toString()).toString(10);
      const eraPerformances = ranking.map(
        ({ performanceHistory }) =>
          performanceHistory.find((performance) => performance.era === era)
            .performance
      );
      minMaxEraPerformance.push({
        era,
        min: Math.min(...eraPerformances),
        max: Math.max(...eraPerformances),
      });
    });

    // find largest cluster size
    const largestCluster = Math.max(
      ...Array.from(ranking, (o) => o.clusterMembers)
    );
    logger.debug(`LARGEST cluster size is ${largestCluster}`);
    logger.debug(
      `SMALL cluster size is between 2 and ${Math.round(largestCluster / 3)}`
    );
    logger.debug(
      `MEDIUM cluster size is between ${Math.round(largestCluster / 3)} and ${
        Math.round(largestCluster / 3) * 2
      }`
    );
    logger.debug(
      `LARGE cluster size is between ${Math.round(
        (largestCluster / 3) * 2
      )} and ${largestCluster}`
    );
    // find Pareto-dominated validators
    logger.debug("Finding dominated validators");
    const dominatedStart = new Date().getTime();
    ranking = ranking.map((validator) => {
      // populate relativePerformanceHistory
      const relativePerformanceHistory = [];
      validator.performanceHistory.forEach((performance) => {
        const eraMinPerformance = minMaxEraPerformance.find(
          ({ era }) => era === performance.era
        ).min;
        const eraMaxPerformance = minMaxEraPerformance.find(
          ({ era }) => era === performance.era
        ).max;
        const relativePerformance = (
          (performance.performance - eraMinPerformance) /
          (eraMaxPerformance - eraMinPerformance)
        ).toFixed(6);
        relativePerformanceHistory.push({
          era: performance.era,
          relativePerformance: parseFloat(relativePerformance),
        });
      });
      // dominated validator logic
      let dominated = false;
      for (const opponent of ranking) {
        if (
          opponent !== validator &&
          parseFloat(opponent.relativePerformance) >=
            parseFloat(validator.relativePerformance) &&
          opponent.selfStake.gte(validator.selfStake) &&
          opponent.activeEras >= validator.activeEras &&
          opponent.totalRating >= validator.totalRating
        ) {
          dominated = true;
          break;
        }
      }
      return {
        ...validator,
        relativePerformanceHistory,
        dominated,
      };
    });
    const dominatedEnd = new Date().getTime();
    logger.debug(
      `Found ${
        ranking.filter(({ dominated }) => dominated).length
      } dominated validators in ${(
        (dominatedEnd - dominatedStart) /
        1000
      ).toFixed(3)}s`
    );

    // cluster categorization
    logger.debug("Random selection of validators based on cluster size");
    let validatorsToHide = [];
    for (const cluster of clusters) {
      const clusterMembers = ranking.filter(
        ({ clusterName }) => clusterName === cluster
      );
      const clusterSize = clusterMembers[0].clusterMembers;
      // EXTRASMALL: 2 - Show all (2)
      let show = 2;
      if (clusterSize > 50) {
        // EXTRALARGE: 51-150 - Show 20% val. (up to 30)
        show = Math.floor(clusterSize * 0.2);
      } else if (clusterSize > 20) {
        // LARGE: 21-50 - Show 40% val. (up to 20)
        show = Math.floor(clusterSize * 0.4);
      } else if (clusterSize > 10) {
        // MEDIUM: 11-20 - Show 60% val. (up to 12)
        show = Math.floor(clusterSize * 0.6);
      } else if (clusterSize > 2) {
        // SMALL: 3-10 - Show 80% val. (up to 8)
        show = Math.floor(clusterSize * 0.8);
      }
      const hide = clusterSize - show;
      // randomly select 'hide' number of validators
      // from cluster and set 'showClusterMember' prop to false
      const rankingPositions = clusterMembers.map(
        (validator) => validator.rank
      );
      validatorsToHide = validatorsToHide.concat(
        utils.getRandom(rankingPositions, hide)
      );
    }
    ranking = ranking.map((validator) => {
      const modValidator = validator;
      if (validatorsToHide.includes(validator.rank)) {
        modValidator.showClusterMember = false;
      }
      return modValidator;
    });
    logger.debug(`Finished, ${validatorsToHide.length} validators hided!`);

    // We want to store era stats only when there's a new consolidated era in chain history
    if (parseInt(activeEra, 10) - 1 > parseInt(lastEraInDb, 10)) {
      logger.debug("Storing era stats in db...");
      await Promise.all(
        ranking.map((validator) =>
          insertEraValidatorStats(client, validator, activeEra)
        )
      );

      logger.info("remove old era stats in db...");
      await removeEraValidatorStats(client, activeEra);

      logger.info("remove old average era stats in db...");
      await removeEraValidatorAvgStats(client, activeEra);

      logger.debug("Storing era stats averages in db...");
      await Promise.all(
        eraIndexes.map((eraIndex) =>
          insertEraValidatorStatsAvg(client, eraIndex)
        )
      );
    } else {
      logger.debug("Updating era averages is not needed!");
    }

    logger.debug(`Storing ${ranking.length} validators in db...`);

    await Promise.all(
      ranking.map((validator) =>
        insertRankingValidator(client, validator, blockHeight, startTime)
      )
    );

    logger.debug("Cleaning old data");
    await removeRanking(client, blockHeight);

    // get candidates that meet the rules
    const featuredCol = await utils.db.getFeatureColCollection(client);
    const res = await featuredCol
      .find({})
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (res.length === 0) {
      await addNewFeaturedValidator(client, ranking);
    } else {
      const currentFeatured = res[0];
      const currentTimestamp = new Date().getTime();
      if (
        currentTimestamp - currentFeatured.timestamp >
        config.featuredTimespan
      ) {
        // timespan passed, let's add a new featured validator
        await addNewFeaturedValidator(client, ranking);
      }
    }

    logger.debug("Disconnecting from API");
    await api
      .disconnect()
      .catch((error) =>
        logger.error(`API disconnect error: ${JSON.stringify(error)}`)
      );

    logger.debug("Disconnecting from DB");
    await client
      .close()
      .catch((error) =>
        logger.error(`DB disconnect error: ${JSON.stringify(error)}`)
      );

    const endTime = new Date().getTime();
    const dataProcessingTime = endTime - dataCollectionEndTime;
    logger.info(
      `Added ${ranking.length} validators in ${(
        (dataCollectionTime + dataProcessingTime) /
        1000
      ).toFixed(3)}s`
    );
    logger.info(
      `Next execution in ${(config.pollingTime / 60000).toFixed(0)}m...`
    );
  } catch (error) {
    logger.error(`General error in ranking crawler: ${JSON.stringify(error)}`);
    Sentry.captureException(error);
  }
  setTimeout(() => crawler(false), config.pollingTime);
}

crawler(false).catch((error) => {
  logger.error(`Crawler error: ${error}`);
  Sentry.captureException(error);
  process.exit(-1);
});
