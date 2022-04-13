const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports.backendConfig = {
    productStatus: process.env.PRODUCT_EVN || "development",
    // substrateNetwork: process.env.SUBSTRATE_NETWORK || 'cardamom',
    wsProviderUrl: process.env.PROVIDER || 'ws://substrate-node:9944',
    MongodbConnParams: {
      url: process.env.MONGO_URI || "mongodb://localhost:27017",
      db: process.env.DATABASE || 'TestDadabase',
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
      transfer: "transfer"
    
    },
    sentryDSN: process.env.SENTRY_DSN || '',
    crawlers: [
      {
        name: 'blockHarvester',
        enabled: !process.env.BLOCK_HARVESTER_DISABLE,
        crawler: 'crawler/blockHarvester.js',
        apiCustomTypes: process.env.API_CUSTOM_TYPES || '',
        mode: process.env.BLOCK_HARVESTER_MODE || 'seq',
        chunkSize: parseInt(process.env.BLOCK_HARVESTER_CHUNK_SIZE, 10) || 10,
      },
      {
        name: 'activeAccounts',
        enabled: !process.env.ACTIVE_ACCOUNTS_DISABLE,
        crawler: 'crawler/activeAccount.js',
        startDelay:
          parseInt(process.env.ACTIVE_ACCOUNTS_START_DELAY_MS, 10) || 6 * 1000,
        chunkSize: parseInt(process.env.ACTIVE_ACCOUNTS_CHUNK_SIZE, 10) || 100,
        pollingTime:
          parseInt(process.env.ACTIVE_ACCOUNTS_POLLING_TIME_MS, 10) ||
          6 * 60 * 60 * 1000, // 6 hours
      },
    ],
};