const Sentry = require("@sentry/node");
// const { spawn } = require('child_process');
const { exec } = require("child_process");

const logger = require("./utils/logger");
const utils = require("./utils");
const { backendConfig } = require("./config");

Sentry.init({
  dsn: backendConfig.sentryDSN,
  tracesSampleRate: 1.0,
});

async function runCrawler(crawler) {
  const child = exec(`node ${crawler}`);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on("error", (error) => {
    logger.error(`Crawler error: ${error}`);
  });
  child.on("close", (code) => {
    logger.error(`Crawler closed with code ${code}`);
  });
  child.on("exit", (code) => {
    logger.error(`Crawler exited with code ${code}`);
  });
}

async function runCrawlers() {
  logger.info("Starting backend, waiting 10s...");

  logger.debug("Running crawlers");
  await Promise.all(
    backendConfig.crawlers
      .filter(({ enabled }) => enabled)
      .map(({ crawler }) => runCrawler(crawler))
  );
}

runCrawlers();
