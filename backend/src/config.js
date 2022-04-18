const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

module.exports.backendConfig = {
  productStatus: process.env.PRODUCT_EVN || "development",
  // substrateNetwork: process.env.SUBSTRATE_NETWORK || 'cardamom',
  wsProviderUrl: process.env.PROVIDER || "ws://substrate-node:9944",
  MongodbConnParams: {
    url: process.env.MONGO_URI || "mongodb://localhost:27017",
    db: process.env.DATABASE || "TestDadabase",
    vdb: process.env.VALIDATEDATABASE || "TestValidatorDadabase",
  },
  MongoDbCol: {
    account: "accounts",
    block: "blocks",
    event: "events",
    extrinsic: "extrinsics",
    log: "logs",
    runtime: "runtimes",
    signedExtrinsic: "signed_extrinsic",
    stakingReward: "staking_reward",
    stakingSlash: "staking_slash",
    transfer: "transfer",
    validator: "valaidator_status",
    validatorFeature: "valaidator_feature",
    validatorRanking: "valaidator_ranking",
    eraValidatorScore: "era_valiator_score",
    eraRelativePerformance: "era_relative_performance",
    eraSelfStake: "era_self_stake",
    eraPoints: "era_points",
    eraCommission: "era_commission",
    eraValidatorScoreAvg: "era_valiator_score_avg",
    eraRelativePerformanceAvg: "era_relative_performance_avg",
    eraSelfStakeAvg: "era_self_stake_avg",
    eraPointsAvg: "era_points_avg",
    eraCommissionAvg: "era_commission_avg",
  },
  sentryDSN: process.env.SENTRY_DSN || "",
  crawlers: [
    {
      name: "blockHarvester",
      enabled: !process.env.BLOCK_HARVESTER_DISABLE,
      crawler: "src/crawler/blockHarvester.js",
      apiCustomTypes: process.env.API_CUSTOM_TYPES || "",
      mode: process.env.BLOCK_HARVESTER_MODE || "seq",
      chunkSize: parseInt(process.env.BLOCK_HARVESTER_CHUNK_SIZE, 10) || 10,
    },
    {
      name: "activeAccounts",
      enabled: !process.env.ACTIVE_ACCOUNTS_DISABLE,
      crawler: "src/crawler/activeAccount.js",
      startDelay:
        parseInt(process.env.ACTIVE_ACCOUNTS_START_DELAY_MS, 10) || 6 * 1000,
      chunkSize: parseInt(process.env.ACTIVE_ACCOUNTS_CHUNK_SIZE, 10) || 100,
      pollingTime:
        parseInt(process.env.ACTIVE_ACCOUNTS_POLLING_TIME_MS, 10) ||
        6 * 60 * 60 * 1000, // 6 hours
    },
    {
      name: "ranking",
      enabled: !process.env.RANKING_DISABLE,
      crawler: "src/crawler/stakingRank.js",
      startDelay: parseInt(process.env.RANKING_START_DELAY_MS, 10) || 1 * 1000,
      pollingTime:
        parseInt(process.env.RANKING_POLLING_TIME_MS, 10) || 60 * 60 * 1000,
      historySize: 84,
      erasPerDay: 2,
      featuredTimespan: 60 * 60 * 24 * 7 * 2 * 1000, // 2 weeks
    },
  ],
};
