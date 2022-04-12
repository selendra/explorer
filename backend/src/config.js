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
    sentryDSN: process.env.SENTRY_DSN || '',
    crawlers: [
      {
        name: 'blockListener',
        enabled: !process.env.BLOCK_LISTENER_DISABLE,
        crawler: './built/crawlers/blockListener.js',
        statsPrecision: parseInt(process.env.BACKEND_STATS_PRECISION, 10) || 2,
      },
      {
        name: 'blockHarvester',
        enabled: !process.env.BLOCK_HARVESTER_DISABLE,
        crawler: './built/crawlers/blockHarvester.js',
        apiCustomTypes: process.env.API_CUSTOM_TYPES || '',
        startDelay:
          parseInt(process.env.BLOCK_HARVESTER_START_DELAY_MS, 10) || 8 * 1000,
        mode: process.env.BLOCK_HARVESTER_MODE || 'chunks',
        chunkSize: parseInt(process.env.BLOCK_HARVESTER_CHUNK_SIZE, 10) || 10,
        statsPrecision: parseInt(process.env.BACKEND_STATS_PRECISION, 10) || 2,
        pollingTime:
          parseInt(process.env.BLOCK_LISTENER_POLLING_TIME_MS, 10) ||
          60 * 60 * 1000,
      },
      // {
      //   name: 'ranking',
      //   enabled: !process.env.RANKING_DISABLE,
      //   crawler: './built/crawlers/ranking.js',
      //   startDelay:
      //     parseInt(process.env.RANKING_START_DELAY_MS, 10) || 15 * 60 * 1000,
      //   pollingTime:
      //     parseInt(process.env.RANKING_POLLING_TIME_MS, 10) || 5 * 60 * 1000,
      //   historySize: 84,
      //   erasPerDay: 4,
      //   tokenDecimals: 12,
      //   featuredTimespan: 60 * 60 * 24 * 7 * 2 * 1000, // 2 weeks
      //   statsPrecision: parseInt(process.env.BACKEND_STATS_PRECISION, 10) || 2,
      // },
      {
        name: 'activeAccounts',
        enabled: !process.env.ACTIVE_ACCOUNTS_DISABLE,
        crawler: './built/crawlers/activeAccounts.js',
        startDelay:
          parseInt(process.env.ACTIVE_ACCOUNTS_START_DELAY_MS, 10) || 60 * 1000,
        chunkSize: parseInt(process.env.ACTIVE_ACCOUNTS_CHUNK_SIZE, 10) || 100,
        pollingTime:
          parseInt(process.env.ACTIVE_ACCOUNTS_POLLING_TIME_MS, 10) ||
          6 * 60 * 60 * 1000, // 6 hours
        statsPrecision: parseInt(process.env.BACKEND_STATS_PRECISION, 10) || 2,
      },
    ],
};