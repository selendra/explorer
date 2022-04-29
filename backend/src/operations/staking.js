const Sentry = require("@sentry/node");

const utils = require("../utils");
const logger = require("../utils/logger");
const { backendConfig } = require("../config");
const { BigNumber } = require("bignumber.js");
const {
  insertCommisonAvg,
  insertSelfStakAvg,
  insertAvgPerformance,
  insertAvgPoint,
} = require("./staking_avg.js");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

function isVerifiedIdentity(identity) {
  if (identity.judgements.length === 0) {
    return false;
  }
  return identity.judgements
    .filter(([, judgement]) => !judgement.isFeePaid)
    .some(([, judgement]) => judgement.isKnownGood || judgement.isReasonable);
}

function getName(identity) {
  if (
    identity.displayParent &&
    identity.displayParent !== "" &&
    identity.display &&
    identity.display !== ""
  ) {
    return `${identity.displayParent}/${identity.display}`;
  }
  return identity.display || "";
}

function getClusterName(identity) {
  identity.displayParent || "";
}

function subIdentity(identity) {
  if (
    identity.displayParent &&
    identity.displayParent !== "" &&
    identity.display &&
    identity.display !== ""
  ) {
    return true;
  }
  return false;
}

function getIdentityRating(name, verifiedIdentity, hasAllFields) {
  if (verifiedIdentity && hasAllFields) {
    return 3;
  }
  if (verifiedIdentity && !hasAllFields) {
    return 2;
  }
  if (name !== "") {
    return 1;
  }
  return 0;
}

function parseIdentity(identity) {
  const verifiedIdentity = isVerifiedIdentity(identity);
  const hasSubIdentity = subIdentity(identity);
  const name = getName(identity);
  const hasAllFields =
    identity?.display !== undefined &&
    identity?.legal !== undefined &&
    identity?.web !== undefined &&
    identity?.email !== undefined &&
    identity?.twitter !== undefined &&
    identity?.riot !== undefined;
  const identityRating = getIdentityRating(
    name,
    verifiedIdentity,
    hasAllFields
  );
  return {
    verifiedIdentity,
    hasSubIdentity,
    name,
    identityRating,
  };
}

function getCommissionHistory(accountId, erasPreferences) {
  const commissionHistory = [];
  erasPreferences.forEach(({ era, validators }) => {
    if (validators[accountId]) {
      commissionHistory.push({
        era: new BigNumber(era.toString()).toNumber(10),
        commission: (validators[accountId].commission / 10000000).toFixed(2),
      });
    } else {
      commissionHistory.push({
        era: new BigNumber(era.toString()).toNumber(10),
        commission: null,
      });
    }
  });
  return commissionHistory;
}

function getCommissionRating(commission, commissionHistory) {
  if (commission !== 100 && commission !== 0) {
    if (commission > 10) {
      return 1;
    }
    if (commission >= 5) {
      if (
        commissionHistory.length > 1 &&
        commissionHistory[0] > commissionHistory[commissionHistory.length - 1]
      ) {
        return 3;
      }
      return 2;
    }
    if (commission < 5) {
      return 3;
    }
  }
  return 0;
}

function getPayoutRating(config, payoutHistory) {
  const pendingEras = payoutHistory.filter(
    (era) => era.status === "pending"
  ).length;
  if (pendingEras <= config.erasPerDay) {
    return 3;
  }
  if (pendingEras <= 3 * config.erasPerDay) {
    return 2;
  }
  if (pendingEras < 7 * config.erasPerDay) {
    return 1;
  }
  return 0;
}

function getClusterInfo(hasSubIdentity, validators, validatorIdentity) {
  if (!hasSubIdentity) {
    // string detection
    if (validatorIdentity.display) {
      const stringSize = 6;
      const clusterMembers = validators.filter(
        ({ identity }) =>
          (identity.display || "").substring(0, stringSize) ===
          validatorIdentity.display.substring(0, stringSize)
      ).length;
      const clusterName = validatorIdentity.display
        .replace(/\d{1,2}$/g, "")
        .replace(/-$/g, "")
        .replace(/_$/g, "");
      return {
        clusterName,
        clusterMembers,
      };
    }
    return {
      clusterName: "",
      clusterMembers: 0,
    };
  }

  const clusterMembers = validators.filter(
    ({ identity }) => identity.displayParent === validatorIdentity.displayParent
  ).length;
  const clusterName = getClusterName(validatorIdentity);
  return {
    clusterName,
    clusterMembers,
  };
}

async function insertEraValidatorStats(client, validator, activeEra) {
  const data = {
    $set: {
      stashAddress: validator.stashAddress,
      era: activeEra,
      validaorRankScore: validator.totalRating,
    },
  };
  const query = { stashAddress: validator.stashAddress, era: activeEra };
  const options = { upsert: true };

  const eraVrcCol = await utils.db.getEraVRCColCollection(client);
  await eraVrcCol.updateOne(query, data, options);

  for (const commissionHistoryItem of validator.commissionHistory) {
    if (commissionHistoryItem.commission) {
      const data = {
        $set: {
          stashAddress: validator.stashAddress,
          era: parseInt(commissionHistoryItem.era),
          commission: parseFloat(commissionHistoryItem.commission),
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: parseInt(commissionHistoryItem.era),
      };
      const options = { upsert: true };

      const eraCommissionCol = await utils.db.getEraCommissionColCollection(
        client
      );
      await eraCommissionCol.updateOne(query, data, options);
    }
  }
  for (const perfHistoryItem of validator.relativePerformanceHistory) {
    if (
      perfHistoryItem.relativePerformance &&
      perfHistoryItem.relativePerformance > 0
    ) {
      const data = {
        $set: {
          stashAddress: validator.stashAddress,
          era: parseInt(perfHistoryItem.era),
          relativePerformance: perfHistoryItem.relativePerformance,
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: parseInt(perfHistoryItem.era),
      };
      const options = { upsert: true };

      const eraRPCol = await utils.db.getEraRPColCollection(client);
      await eraRPCol.updateOne(query, data, options);
    }
  }
  for (const stakefHistoryItem of validator.stakeHistory) {
    if (stakefHistoryItem.self && stakefHistoryItem.self !== 0) {
      const data = {
        $set: {
          stashAddress: validator.stashAddress,
          era: parseInt(stakefHistoryItem.era),
          selfStake: new BigNumber(stakefHistoryItem.self)
            .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
            .toNumber(),
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: parseInt(stakefHistoryItem.era),
      };
      const options = { upsert: true };

      const eraSSCol = await utils.db.getEraSelfStakeColCollection(client);
      await eraSSCol.updateOne(query, data, options);
    }
  }
  for (const eraPointsHistoryItem of validator.eraPointsHistory) {
    if (eraPointsHistoryItem.points && eraPointsHistoryItem.points !== 0) {
      const data = {
        $set: {
          stashAddress: validator.stashAddress,
          era: parseInt(eraPointsHistoryItem.era),
          points: eraPointsHistoryItem.points,
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: parseInt(eraPointsHistoryItem.era),
      };
      const options = { upsert: true };

      const eraEraPointsCol = await utils.db.getEraPointsColCollection(client);
      await eraEraPointsCol.updateOne(query, data, options);
    }
  }
}

async function getAddressCreation(client, address) {
  const query = { method: "NewAccount" };
  const eventCol = await utils.db.getEventCollection(client);
  let result = await eventCol.find(query).toArray();
  for (let i = 0; i < result.length; i++) {
    if (address === JSON.parse(result[i].data)[0]) {
      return result[i].blockNumber;
    }
  }
  // if not found we assume it was created in genesis block
  return 0;
}

async function getLastEraInDb(client) {
  const eraCommissionCol = await utils.db.getEraCommissionColCollection(client);
  let res = await eraCommissionCol
    .find({})
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  if (res.length > 0) {
    return res[0].era;
  }
  return 0;
}

async function insertRankingValidator(
  client,
  validator,
  blockHeight,
  startTime
) {
  let nominators = [];

  await Promise.all(
    validator.nominations.map((nominator) => {
      if (nominator.who) {
        let norminate = {};
        norminate.staking = nominator.who.toString();
        norminate.amount = new BigNumber(nominator.value)
          .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
          .toNumber();
        nominators.push(norminate);
      } else {
        let norminate = {};
        norminate.staking = nominator.nominator.toString();
        norminate.amount = null;
        nominators.push(norminate);
      }
    })
  );

  const data = {
    $set: {
      blockHeight: blockHeight,
      rank: validator.rank,
      active: validator.active,
      activeRating: validator.activeRating,
      name: validator.name,
      identity: JSON.stringify(validator.identity),
      hasSubIdentity: validator.hasSubIdentity,
      subAccountsRating: validator.subAccountsRating,
      verifiedIdentity: validator.verifiedIdentity,
      identityRating: validator.identityRating,
      stashAddress: validator.stashAddress,
      stashAddressCreationBlock: validator.stashCreatedAtBlock,
      stashParentAddressCreationBlock: validator.stashParentCreatedAtBlock,
      addressCreationCating: validator.addressCreationRating,
      controllerAddress: validator.controllerAddress,
      partOfCluster: validator.partOfCluster,
      clusterName: validator.clusterName,
      clusterMembers: validator.clusterMembers,
      show_clusterMember: validator.showClusterMember,
      nominators: validator.nominators,
      nominatorsRating: validator.nominatorsRating,
      nominations: nominators,
      commission: parseFloat(validator.commission),
      commissionHistory: JSON.stringify(validator.commissionHistory),
      commissionRating: validator.commissionRating,
      activeEras: validator.activeEras,
      eraPointsHistory: JSON.stringify(validator.eraPointsHistory),
      eraPointsPercent: validator.eraPointsPercent,
      eraPointsRating: validator.eraPointsRating,
      performance: validator.performance,
      performanceHistory: JSON.stringify(validator.performanceHistory),
      relativePerformance: parseFloat(validator.relativePerformance),
      relativePerformanceHistory: parseFloat(validator.relativePerformance),
      slashed: validator.slashed,
      slash_rating: validator.slashRating,
      slashes: JSON.stringify(validator.slashes),
      councilBacking: validator.councilBacking,
      activeInGovernance: validator.activeInGovernance,
      governanceRating: validator.governanceRating,
      payoutHistory: JSON.stringify(validator.payoutHistory),
      payoutRating: validator.payoutRating,
      selfStake: new BigNumber(validator.selfStake)
        .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
        .toNumber(),
      otherStake: new BigNumber(validator.otherStake)
        .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
        .toNumber(),
      totalStake: new BigNumber(validator.totalStake)
        .dividedBy(Math.pow(10, backendConfig.TokenDecimal))
        .toNumber(),
      stakeHistory: JSON.stringify(validator.stakeHistory),
      totalRating: validator.totalRating,
      dominated: validator.dominated,
      timestamp: startTime,
    },
  };
  const query = {
    blockHeight: blockHeight,
    stashAddress: validator.stashAddress,
  };
  const options = { upsert: true };

  const validatorRanking = await utils.db.getValidatorRankingColCollection(
    client
  );
  await validatorRanking.updateOne(query, data, options);
}

async function removeRanking(client, blockHeight) {
  const query = { blockHeight: { $ne: blockHeight } };

  const validatorRanking = await utils.db.getValidatorRankingColCollection(
    client
  );
  await validatorRanking.deleteMany(query);
}

async function insertEraValidatorStatsAvg(client, eraIndex) {
  const era = new BigNumber(eraIndex.toString()).toNumber();
  await insertCommisonAvg(client, era);
  await insertSelfStakAvg(client, era);
  await insertAvgPerformance(client, era);
  await insertAvgPoint(client, era);
}

async function addNewFeaturedValidator(client, ranking) {
  // get previously featured
  const alreadyFeatured = [];

  // get candidates that meet the rules
  const featuredCol = await utils.db.getFeatureColCollection(client);

  const res = await featuredCol.find({}).toArray();
  res.forEach((validator) => alreadyFeatured.push(validator.stashAddress));

  const featuredCandidates = ranking
    .filter(
      (validator) =>
        validator.commission <= 10 &&
        validator.selfStake.div(10 ** 18).gte(2999) &&
        !validator.active &&
        !alreadyFeatured.includes(validator.stashAddress)
    )
    .map(({ rank }) => rank);
  // get random featured validator of the week
  const shuffled = [...featuredCandidates].sort(() => 0.5 - Math.random());
  const randomRank = shuffled[0];
  const featured = ranking.find((validator) => validator.rank === randomRank);

  const data = {
    stashAddress: featured.stashAddress,
    name: featured.name,
    timestamp: new Date().getTime(),
  };

  await featuredCol.deleteMany({});
  await featuredCol.insertOne(data);

  logger.debug(
    `New featured validator added: ${featured.name} ${featured.stashAddress}`
  );
}

module.exports = {
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
};
