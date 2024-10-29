require('dotenv').config();

export const config = {
  WsProvider: process.env.WSPROVIDER || 'wss://rpc.selendra.org',
  logLevel: process.env.LOG_LEVEL || 'info',
  sentryDSN: process.env.SENTRY_DSN || '',
  mongoDB: { 
    username: process.env.MONGODB_USERNAME || 'selendra',
    password: process.env.MONGODB_PASSWORD || 'selendra',
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || 'port',
    database: process.env.MONGODB_DATABASE || 'Explorer',
  },
};