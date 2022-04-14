const Sentry = require("@sentry/node");

const utils = require("../utils");
const logger = require("../utils/logger");
const { backendConfig } = require("../config");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

// function isVerifiedIdentity(identity){
//     if (identity.judgements.length === 0) {
//       return false;
//     }
//     return identity.judgements
//       .filter(([, judgement]) => !judgement.isFeePaid)
//       .some(([, judgement]) => judgement.isKnownGood || judgement.isReasonable);
// };

// function getName(identity){
//     if (
//       identity.displayParent &&
//       identity.displayParent !== '' &&
//       identity.display &&
//       identity.display !== ''
//     ) {
//       return `${identity.displayParent}/${identity.display}`;
//     }
//     return identity.display || '';
// };

// function getClusterName(identity){
//     identity.displayParent || '';
// }

// function subIdentity(identity){
//   if (
//     identity.displayParent &&
//     identity.displayParent !== '' &&
//     identity.display &&
//     identity.display !== ''
//   ) {
//     return true;
//   }
//   return false;
// };

// function getIdentityRating(name, verifiedIdentity, hasAllFields){
//     if (verifiedIdentity && hasAllFields) {
//       return 3;
//     }
//     if (verifiedIdentity && !hasAllFields) {
//       return 2;
//     }
//     if (name !== '') {
//       return 1;
//     }
//     return 0;
// };

// function parseIdentity(identity){
//     const verifiedIdentity = isVerifiedIdentity(identity);
//     const hasSubIdentity = subIdentity(identity);
//     const name = getName(identity);
//     const hasAllFields =
//       identity?.display !== undefined &&
//       identity?.legal !== undefined &&
//       identity?.web !== undefined &&
//       identity?.email !== undefined &&
//       identity?.twitter !== undefined &&
//       identity?.riot !== undefined;
//     const identityRating = getIdentityRating(
//       name,
//       verifiedIdentity,
//       hasAllFields,
//     );
//     return {
//       verifiedIdentity,
//       hasSubIdentity,
//       name,
//       identityRating,
//     };
// };

// function getCommissionHistory(accountId, erasPreferences){
//     const commissionHistory = [];
//     erasPreferences.forEach(({ era, validators }) => {
//       if (validators[accountId]) {
//         commissionHistory.push({
//           era: new BigNumber(era.toString()).toNumber(10),
//           commission: (validators[accountId].commission / 10000000).toFixed(2),
//         });
//       } else {
//         commissionHistory.push({
//           era: new BigNumber(era.toString()).toNumber(10),
//           commission: null,
//         });
//       }
//     });
//     return commissionHistory;
// };

// function getCommissionRating(commission, commissionHistory){
//     if (commission !== 100 && commission !== 0) {
//       if (commission > 10) {
//         return 1;
//       }
//       if (commission >= 5) {
//         if (
//           commissionHistory.length > 1 &&
//           commissionHistory[0] > commissionHistory[commissionHistory.length - 1]
//         ) {
//           return 3;
//         }
//         return 2;
//       }
//       if (commission < 5) {
//         return 3;
//       }
//     }
//     return 0;
// };

// function getPayoutRating(config, payoutHistory){
//     const pendingEras = payoutHistory.filter(
//       (era) => era.status === 'pending',
//     ).length;
//     if (pendingEras <= config.erasPerDay) {
//       return 3;
//     }
//     if (pendingEras <= 3 * config.erasPerDay) {
//       return 2;
//     }
//     if (pendingEras < 7 * config.erasPerDay) {
//       return 1;
//     }
//     return 0;
// };

// function getClusterInfo(hasSubIdentity, validators, validatorIdentity){
//     if (!hasSubIdentity) {
//       // string detection
//       if (validatorIdentity.display) {
//         const stringSize = 6;
//         const clusterMembers = validators.filter(
//           ({ identity }) =>
//             (identity.display || '').substring(0, stringSize) ===
//             validatorIdentity.display.substring(0, stringSize),
//         ).length;
//         const clusterName = validatorIdentity.display
//           .replace(/\d{1,2}$/g, '')
//           .replace(/-$/g, '')
//           .replace(/_$/g, '');
//         return {
//           clusterName,
//           clusterMembers,
//         };
//       }
//       return {
//         clusterName: '',
//         clusterMembers: 0,
//       };
//     }

//     const clusterMembers = validators.filter(
//       ({ identity }) =>
//         identity.displayParent === validatorIdentity.displayParent,
//     ).length;
//     const clusterName = getClusterName(validatorIdentity);
//     return {
//       clusterName,
//       clusterMembers,
//     };
// };

// async function getLastEraInDb(client){
//   // era_points_avg, era_relative_performance_avg, era_self_stake_avg
//   const query = 'SELECT era FROM era_commission_avg ORDER BY era DESC LIMIT 1';
//   const res = await dbQuery(client, query, loggerOptions);
//   if (res) {
//     if (res.rows.length > 0) {
//       if (res.rows[0].era) {
//         return res.rows[0].era;
//       }
//     }
//   }
//   return '0';
// };

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
          era: commissionHistoryItem.era,
          commission: commissionHistoryItem.commission,
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: commissionHistoryItem.era,
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
          era: perfHistoryItem.era,
          relativePerformance: perfHistoryItem.relativePerformance,
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: perfHistoryItem.era,
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
          era: stakefHistoryItem.era,
          selfStake: stakefHistoryItem.selfe,
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: stakefHistoryItem.era,
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
          era: eraPointsHistoryItem.era,
          points: eraPointsHistoryItem.points,
        },
      };
      const query = {
        stashAddress: validator.stashAddress,
        era: eraPointsHistoryItem.era,
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

// async function insertEraValidatorStatsAvg(client, eraIndex, loggerOptionss){
//   const era = new BigNumber(eraIndex.toString()).toString(10);
//   let data = [era];
//   let sql =
//     'SELECT AVG(commission) AS commission_avg FROM era_commission WHERE era = $1 AND commission != 100';
//   let res = await dbParamQuery(client, sql, data, loggerOptions);
//   if (res.rows.length > 0) {
//     if (res.rows[0].commission_avg) {
//       data = [era, res.rows[0].commission_avg];
//       sql =
//         'INSERT INTO era_commission_avg (era, commission_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_commission_avg_pkey DO NOTHING;';
//       await dbParamQuery(client, sql, data, loggerOptions);
//     }
//   }
//   sql =
//     'SELECT AVG(self_stake) AS self_stake_avg FROM era_self_stake WHERE era = $1';
//   data = [era];
//   res = await dbParamQuery(client, sql, data, loggerOptions);
//   if (res.rows.length > 0) {
//     if (res.rows[0].self_stake_avg) {
//       const selfStakeAvg = res.rows[0].self_stake_avg
//         .toString(10)
//         .split('.')[0];
//       data = [era, selfStakeAvg];
//       sql =
//         'INSERT INTO era_self_stake_avg (era, self_stake_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_self_stake_avg_pkey DO NOTHING;';
//       await dbParamQuery(client, sql, data, loggerOptions);
//     }
//   }
//   sql =
//     'SELECT AVG(relative_performance) AS relative_performance_avg FROM era_relative_performance WHERE era = $1';
//   data = [era];
//   res = await dbParamQuery(client, sql, data, loggerOptions);
//   if (res.rows.length > 0) {
//     if (res.rows[0].relative_performance_avg) {
//       data = [era, res.rows[0].relative_performance_avg];
//       sql =
//         'INSERT INTO era_relative_performance_avg (era, relative_performance_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_relative_performance_avg_pkey DO NOTHING;';
//       await dbParamQuery(client, sql, data, loggerOptions);
//     }
//   }
//   sql = 'SELECT AVG(points) AS points_avg FROM era_points WHERE era = $1';
//   data = [era];
//   res = await dbParamQuery(client, sql, data, loggerOptions);
//   if (res.rows.length > 0) {
//     if (res.rows[0].points_avg) {
//       data = [era, res.rows[0].points_avg];
//       sql =
//         'INSERT INTO era_points_avg (era, points_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_points_avg_pkey DO NOTHING;';
//       await dbParamQuery(client, sql, data, loggerOptions);
//     }
//   }
// };

module.exports = {
  insertEraValidatorStats,
  getAddressCreation,
};
