import 'dotenv/config';

const toNumber = (defaultValue: number, value?: string): number => {
  if (!value) {
    return defaultValue;
  }
  return parseInt(value, 10);
};

const defaultNodeUrls = [
  'ws://127.0.0.1:9944',
];

export default {
  nodeUrls: process.env.NODE_PROVIDER_URLS ? JSON.parse(process.env.NODE_PROVIDER_URLS) as string[] : defaultNodeUrls,
  startBlockSize: toNumber(32, process.env.START_BLOCK_SIZE),
  maxBlocksPerStep: toNumber(1, process.env.MAX_BLOCKS_PER_STEP),
  chunkSize: toNumber(1024, process.env.CHUNK_SIZE),
  pollInterval: toNumber(100, process.env.POLL_INTERVAL),
  sentryDns: process.env.SENTRY_DNS || '',
  sentryBacktrackingDns: process.env.SENTRY_DNS || '',
  environment: process.env.ENVIRONMENT,
  selendraswapFactoryAddress: process.env.FACTORY_ADDRESS || '',
  network: process.env.NETWORK,
  subcontractInterval: process.env.SUBCONTRACT_INTERVAL || 100,
  verifiedContractSyncInterval: process.env.VERIFIED_CONTRACT_SYNC_INTERVAL || 100,
  liveGraphqlUrl: process.env.LIVE_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
  verifiedContractSync: process.env.VERIFIED_CONTRACT_SYNC ? process.env.VERIFIED_CONTRACT_SYNC === 'true' : false,
  tokenDecimals: toNumber(12, process.env.TOKEN_DECIMAL),

  postgresConfig: {
    host: process.env.POSTGRES_HOST || '0.0.0.0',
    port: toNumber(5432, process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER || 'selendraexplorer',
    database: process.env.POSTGRES_DATABASE || 'selendraexplorer',
    password: process.env.POSTGRES_PASSWORD || 'selendraexplorer',
  },

  ValidatorConfig: {
    erasPerDay: toNumber(1, process.env.ERA_PERDAY),
    historySize: toNumber(84, process.env.HISTORY_SIZE),
    runPerera: (24 / toNumber(1, process.env.ERA_PERDAY)) * 60 * 60 * 1000,
  },
};
