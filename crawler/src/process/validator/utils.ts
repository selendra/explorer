import * as Sentry from '@sentry/node';
import { EraIndex } from '@polkadot/types/interfaces';
import { DeriveAccountRegistration } from '@polkadot/api-derive/types';
import { Client } from 'pg';
import { BigNumber } from 'bignumber.js';
import {
  ClusterInfo,
  CommisionHistoryItem,
  IdentityInfo,
} from './types';
import { dbParamQuery, dbQuery } from './db';
import config from '../../config';

Sentry.init({
  dsn: config.sentryDns,
  tracesSampleRate: 1.0,
});

export const isVerifiedIdentity = (
  identity: DeriveAccountRegistration,
): boolean => {
  if (identity.judgements.length === 0) {
    return false;
  }
  return identity.judgements
    .filter(([, judgement]) => !judgement.isFeePaid)
    .some(([, judgement]) => judgement.isKnownGood || judgement.isReasonable);
};

export const getName = (identity: DeriveAccountRegistration): string => {
  if (
    identity.displayParent
    && identity.displayParent !== ''
    && identity.display
    && identity.display !== ''
  ) {
    return `${identity.displayParent}/${identity.display}`;
  }
  return identity.display || '';
};

export const getClusterName = (identity: DeriveAccountRegistration): string => identity.displayParent || '';

export const subIdentity = (identity: DeriveAccountRegistration): boolean => {
  if (
    identity.displayParent
    && identity.displayParent !== ''
    && identity.display
    && identity.display !== ''
  ) {
    return true;
  }
  return false;
};

export const getIdentityRating = (
  name: string,
  verifiedIdentity: boolean,
  hasAllFields: boolean,
): number => {
  if (verifiedIdentity && hasAllFields) {
    return 3;
  }
  if (verifiedIdentity && !hasAllFields) {
    return 2;
  }
  if (name !== '') {
    return 1;
  }
  return 0;
};

export const parseIdentity = (
  identity: DeriveAccountRegistration,
): IdentityInfo => {
  const verifiedIdentity = isVerifiedIdentity(identity);
  const hasSubIdentity = subIdentity(identity);
  const name = getName(identity);
  const hasAllFields = identity?.display !== undefined
    && identity?.legal !== undefined
    && identity?.web !== undefined
    && identity?.email !== undefined
    && identity?.twitter !== undefined
    && identity?.riot !== undefined;
  const identityRating = getIdentityRating(
    name,
    verifiedIdentity,
    hasAllFields,
  );
  return {
    verifiedIdentity,
    hasSubIdentity,
    name,
    identityRating,
  };
};

export const getCommissionHistory = (
  accountId: string | number,
  erasPreferences: any[],
): CommisionHistoryItem[] => {
  const commissionHistory: any = [];
  erasPreferences.forEach(({ era, validators }) => {
    if (validators[accountId]) {
      commissionHistory.push({
        era: new BigNumber(era.toString()).toString(10),
        commission: (validators[accountId].commission / 10000000).toFixed(2),
      });
    } else {
      commissionHistory.push({
        era: new BigNumber(era.toString()).toString(10),
        commission: null,
      });
    }
  });
  return commissionHistory;
};

export const getCommissionRating = (
  commission: number,
  commissionHistory: any[],
): number => {
  if (commission !== 100 && commission !== 0) {
    if (commission > 10) {
      return 1;
    }
    if (commission >= 5) {
      if (
        commissionHistory.length > 1
        && commissionHistory[0] > commissionHistory[commissionHistory.length - 1]
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
};

export const getPayoutRating = (
  payoutHistory: any[],
): number => {
  const pendingEras = payoutHistory.filter(
    (era) => era.status === 'pending',
  ).length;
  if (pendingEras <= config.ValidatorConfig.erasPerDay) {
    return 3;
  }
  if (pendingEras <= 3 * config.ValidatorConfig.erasPerDay) {
    return 2;
  }
  if (pendingEras < 7 * config.ValidatorConfig.erasPerDay) {
    return 1;
  }
  return 0;
};

export const getClusterInfo = (
  hasSubIdentity: boolean,
  validators: any[],
  validatorIdentity: DeriveAccountRegistration,
): ClusterInfo => {
  if (!hasSubIdentity) {
    // string detection
    // samples: DISC-SOFT-01, BINANCE_KSM_9, SNZclient-1
    if (validatorIdentity.display) {
      const stringSize = 6;
      const clusterMembers = validators.filter(
        ({ identity }) => (identity.display || '').substring(0, stringSize)
          === validatorIdentity?.display?.substring(0, stringSize),
      ).length;
      const clusterName = validatorIdentity.display
        .replace(/\d{1,2}$/g, '')
        .replace(/-$/g, '')
        .replace(/_$/g, '');
      return {
        clusterName,
        clusterMembers,
      };
    }
    return {
      clusterName: '',
      clusterMembers: 0,
    };
  }

  const clusterMembers = validators.filter(
    ({ identity }) => identity.displayParent === validatorIdentity.displayParent,
  ).length;
  const clusterName = getClusterName(validatorIdentity);
  return {
    clusterName,
    clusterMembers,
  };
};

export const insertRankingValidator = async (
  client: Client,
  validator: any,
  blockId: number,
  startTime: string,
): Promise<void> => {
  const sql = `INSERT INTO validator (
      block_id,
      rank,
      active,
      active_rating,
      name,
      identity,
      has_sub_identity,
      sub_accounts_rating,
      verified_identity,
      identity_rating,
      stash_address,
      stash_address_creation_block,
      stash_parent_address_creation_block,
      address_creation_rating,
      controller_address,
      part_of_cluster,
      cluster_name,
      cluster_members,
      show_cluster_member,
      nominators,
      nominators_rating,
      nominations,
      commission,
      commission_history,
      commission_rating,
      active_eras,
      era_points_history,
      era_points_percent,
      era_points_rating,
      performance,
      performance_history,
      relative_performance,
      relative_performance_history,
      slashed,
      slash_rating,
      slashes,
      council_backing,
      active_in_governance,
      governance_rating,
      payout_history,
      payout_rating,
      self_stake,
      other_stake,
      total_stake,
      stake_history,
      total_rating,
      dominated,
      timestamp
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19,
      $20,
      $21,
      $22,
      $23,
      $24,
      $25,
      $26,
      $27,
      $28,
      $29,
      $30,
      $31,
      $32,
      $33,
      $34,
      $35,
      $36,
      $37,
      $38,
      $39,
      $40,
      $41,
      $42,
      $43,
      $44,
      $45,
      $46,
      $47,
      $48
    )
    ON CONFLICT ON CONSTRAINT validator_pkey 
    DO NOTHING`;
  const data = [
    blockId,
    validator.rank,
    validator.active,
    validator.activeRating,
    validator.name,
    JSON.stringify(validator.identity),
    validator.hasSubIdentity,
    validator.subAccountsRating,
    validator.verifiedIdentity,
    validator.identityRating,
    validator.stashAddress,
    validator.stashCreatedAtBlock,
    validator.stashParentCreatedAtBlock,
    validator.addressCreationRating,
    validator.controllerAddress,
    validator.partOfCluster,
    validator.clusterName,
    validator.clusterMembers,
    validator.showClusterMember,
    validator.nominators,
    validator.nominatorsRating,
    JSON.stringify(validator.nominations),
    validator.commission,
    JSON.stringify(validator.commissionHistory),
    validator.commissionRating,
    validator.activeEras,
    JSON.stringify(validator.eraPointsHistory),
    validator.eraPointsPercent,
    validator.eraPointsRating,
    validator.performance,
    JSON.stringify(validator.performanceHistory),
    validator.relativePerformance,
    JSON.stringify(validator.relativePerformanceHistory),
    validator.slashed,
    validator.slashRating,
    JSON.stringify(validator.slashes),
    validator.councilBacking,
    validator.activeInGovernance,
    validator.governanceRating,
    JSON.stringify(validator.payoutHistory),
    validator.payoutRating,
    validator.selfStake.toString(10),
    validator.otherStake.toString(10),
    validator.totalStake.toString(10),
    JSON.stringify(validator.stakeHistory),
    validator.totalRating,
    validator.dominated,
    startTime,
  ];
  await dbParamQuery(client, sql, data);
};

export const insertEraValidatorStats = async (
  client: Client,
  validator: any,
  activeEra: any,
): Promise<void> => {
  let sql = `INSERT INTO era_vrc_score (
      stash_address,
      era,
      vrc_score
    ) VALUES (
      $1,
      $2,
      $3
    )
    ON CONFLICT ON CONSTRAINT era_vrc_score_pkey 
    DO NOTHING;`;
  let data = [validator.stashAddress, activeEra, validator.totalRating];
  await dbParamQuery(client, sql, data);
  // eslint-disable-next-line no-restricted-syntax
  for (const commissionHistoryItem of validator.commissionHistory) {
    if (commissionHistoryItem.commission) {
      sql = `INSERT INTO era_commission (
          stash_address,
          era,
          commission
        ) VALUES (
          $1,
          $2,
          $3
        )
        ON CONFLICT ON CONSTRAINT era_commission_pkey 
        DO NOTHING;`;
      data = [
        validator.stashAddress,
        commissionHistoryItem.era,
        commissionHistoryItem.commission,
      ];
      await dbParamQuery(client, sql, data);
    }
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const perfHistoryItem of validator.relativePerformanceHistory) {
    if (
      perfHistoryItem.relativePerformance
      && perfHistoryItem.relativePerformance > 0
    ) {
      sql = `INSERT INTO era_relative_performance (
          stash_address,
          era,
          relative_performance
        ) VALUES (
          $1,
          $2,
          $3
        )
        ON CONFLICT ON CONSTRAINT era_relative_performance_pkey 
        DO NOTHING;`;
      data = [
        validator.stashAddress,
        perfHistoryItem.era,
        perfHistoryItem.relativePerformance,
      ];
      await dbParamQuery(client, sql, data);
    }
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const stakefHistoryItem of validator.stakeHistory) {
    if (stakefHistoryItem.self && stakefHistoryItem.self !== 0) {
      sql = `INSERT INTO era_self_stake (
          stash_address,
          era,
          self_stake
        ) VALUES (
          $1,
          $2,
          $3
        )
        ON CONFLICT ON CONSTRAINT era_self_stake_pkey 
        DO NOTHING;`;
      data = [
        validator.stashAddress,
        stakefHistoryItem.era,
        stakefHistoryItem.self,
      ];
      await dbParamQuery(client, sql, data);
    }
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const eraPointsHistoryItem of validator.eraPointsHistory) {
    if (eraPointsHistoryItem.points && eraPointsHistoryItem.points !== 0) {
      sql = `INSERT INTO era_points (
          stash_address,
          era,
          points
        ) VALUES (
          $1,
          $2,
          $3
        )
        ON CONFLICT ON CONSTRAINT era_points_pkey 
        DO NOTHING;`;
      data = [
        validator.stashAddress,
        eraPointsHistoryItem.era,
        eraPointsHistoryItem.points,
      ];
      await dbParamQuery(client, sql, data);
    }
  }
};

export const getAddressCreation = async (
  client: Client,
  address: string,
): Promise<number> => {
  const query = 'SELECT block_id FROM account WHERE address = $1';
  const res = await dbParamQuery(
    client,
    query,
    [`%${address}%`],
  );
  if (res) {
    if (res.rows.length > 0) {
      if (res.rows[0].block_number) {
        return res.rows[0].block_number;
      }
    }
  }
  // if not found we assume it was created in genesis block
  return 0;
};

export const getLastEraInDb = async (
  client: Client,
): Promise<string> => {
  // TODO: check also:
  // era_points_avg, era_relative_performance_avg, era_self_stake_avg
  const query = 'SELECT era FROM era_commission_avg ORDER BY era DESC LIMIT 1';
  const res = await dbQuery(client, query);
  if (res) {
    if (res.rows.length > 0) {
      if (res.rows[0].era) {
        return res.rows[0].era;
      }
    }
  }
  return '0';
};

export const insertEraValidatorStatsAvg = async (
  client: Client,
  eraIndex: EraIndex,
): Promise<void> => {
  const era = new BigNumber(eraIndex.toString()).toString(10);
  let data = [era];
  let sql = 'SELECT AVG(commission) AS commission_avg FROM era_commission WHERE era = $1 AND commission != 100';
  let res = await dbParamQuery(client, sql, data);
  if (res!.rows.length > 0) {
    if (res!.rows[0].commission_avg) {
      data = [era, res!.rows[0].commission_avg];
      sql = 'INSERT INTO era_commission_avg (era, commission_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_commission_avg_pkey DO NOTHING;';
      await dbParamQuery(client, sql, data);
    }
  }
  sql = 'SELECT AVG(self_stake) AS self_stake_avg FROM era_self_stake WHERE era = $1';
  data = [era];
  res = await dbParamQuery(client, sql, data);
  if (res!.rows.length > 0) {
    if (res!.rows[0].self_stake_avg) {
      const selfStakeAvg = res!.rows[0].self_stake_avg
        .toString(10)
        .split('.')[0];
      data = [era, selfStakeAvg];
      sql = 'INSERT INTO era_self_stake_avg (era, self_stake_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_self_stake_avg_pkey DO NOTHING;';
      await dbParamQuery(client, sql, data);
    }
  }
  sql = 'SELECT AVG(relative_performance) AS relative_performance_avg FROM era_relative_performance WHERE era = $1';
  data = [era];
  res = await dbParamQuery(client, sql, data);
  if (res!.rows.length > 0) {
    if (res!.rows[0].relative_performance_avg) {
      data = [era, res!.rows[0].relative_performance_avg];
      sql = 'INSERT INTO era_relative_performance_avg (era, relative_performance_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_relative_performance_avg_pkey DO NOTHING;';
      await dbParamQuery(client, sql, data);
    }
  }
  sql = 'SELECT AVG(points) AS points_avg FROM era_points WHERE era = $1';
  data = [era];
  res = await dbParamQuery(client, sql, data);
  if (res!.rows.length > 0) {
    if (res!.rows[0].points_avg) {
      data = [era, res!.rows[0].points_avg];
      sql = 'INSERT INTO era_points_avg (era, points_avg) VALUES ($1, $2) ON CONFLICT ON CONSTRAINT era_points_avg_pkey DO NOTHING;';
      await dbParamQuery(client, sql, data);
    }
  }
};
