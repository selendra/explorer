
const Sentry = require('@sentry/node');
const { spawn } = require('child_process');

const logger = require('./utils/logger');
const utils = require('./utils');
const { backendConfig } = require('./config');


Sentry.init({
    dsn: backendConfig.sentryDSN,
    tracesSampleRate: 1.0,
});

async function runCrawler(crawler){
    const child = spawn('node', [`${crawler}`]);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    child.on('error', (error) => {
      logger.error(`Crawler error: ${error}`);
    });
    child.on('close', (code) => {
      logger.error(`Crawler closed with code ${code}`);
      // attempt to restart crawler
      // runCrawler(crawler);
    });
    child.on('exit', (code) => {
      logger.error(`Crawler exited with code ${code}`);
      // attempt to restart crawler
      // runCrawler(crawler);
    });
};

async function runCrawlers(){
    logger.info('Starting backend, waiting 10s...');
    await wait(10000);
  
    console.log("hello")
};
  
runCrawlers().catch((error) => {
    logger.debug(`Error while trying to run crawlers: ${error}`);
    Sentry.captureException(error);
    process.exit(-1);
});
