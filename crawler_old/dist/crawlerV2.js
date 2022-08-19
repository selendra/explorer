"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const integrations_1 = require("@sentry/integrations");
const Sentry = __importStar(require("@sentry/node"));
const config_1 = __importDefault(require("./config"));
const syncVerifiedContracts_1 = __importDefault(require("./crawler/syncVerifiedContracts"));
const block_1 = __importStar(require("./crawlerv2/block"));
const block_2 = require("./queries/block");
const connector_1 = require("./utils/connector");
const logger_1 = __importDefault(require("./utils/logger"));
const Performance_1 = __importDefault(require("./utils/Performance"));
const Queue_1 = __importDefault(require("./utils/Queue"));
const utils_1 = require("./utils/utils");
// Importing @sentry/tracing patches the global hub for tracing to work.
// import * as Tracing from "@sentry/tracing";
/* eslint "no-underscore-dangle": "off" */
Sentry.init({
    dsn: config_1.default.sentryDns,
    tracesSampleRate: 1.0,
    integrations: [
        new integrations_1.RewriteFrames({
            root: global.__dirname,
        }),
    ],
    environment: config_1.default.environment,
});
Sentry.setTag('component', 'crawler');
Sentry.setTag('network', config_1.default.network);
console.warn = () => { };
const crawler = async () => {
    let updateVerifiedContracts = 0;
    let currentBlockIndex = await (0, block_2.lastBlockInDatabase)();
    currentBlockIndex++;
    const queue = new Queue_1.default(config_1.default.maxBlocksPerStep);
    const per = new Performance_1.default(config_1.default.maxBlocksPerStep);
    connector_1.nodeProvider.getProvider().api.rpc.chain.subscribeNewHeads(async (header) => {
        await (0, block_1.processUnfinalizedBlock)(header.number.toNumber());
    });
    while (true) {
        const finalizedHead = connector_1.nodeProvider.lastFinalizedBlockId();
        // Starting to process some amount of blocks
        while (currentBlockIndex <= finalizedHead && !queue.isFull()) {
            queue.push((0, block_1.default)(currentBlockIndex));
            currentBlockIndex++;
        }
        // If queue is empty crawler has nothing to do
        if (queue.isEmpty()) {
            await (0, utils_1.wait)(config_1.default.pollInterval);
            continue;
        }
        // Waiting for the first block to finish and measuring performance
        const start = Date.now();
        await queue.pop();
        const diff = Date.now() - start;
        per.push(diff);
        per.log();
        /**
         * Verification contract sync will only be triggered when:
         * - sync is enabled
         * - crawler is in "listening" mode
         * - on every nth interval
         */
        updateVerifiedContracts += 1;
        if (config_1.default.verifiedContractSync
            && (finalizedHead - currentBlockIndex) <= 3
            && updateVerifiedContracts > config_1.default.verifiedContractSyncInterval) {
            await (0, syncVerifiedContracts_1.default)();
            updateVerifiedContracts = 0;
        }
    }
};
Promise.resolve()
    .then(async () => {
    await connector_1.nodeProvider.initializeProviders();
    logger_1.default.info('Removing unfinished blocks...');
    await (0, block_2.deleteUnfinishedBlocks)();
})
    .then(() => {
    logger_1.default.info(`Contract verification sync: ${config_1.default.verifiedContractSync}`);
})
    .then(crawler)
    .then(async () => {
    await connector_1.nodeProvider.closeProviders();
    logger_1.default.info('Finished');
    process.exit();
})
    .catch(async (error) => {
    logger_1.default.error(error);
    Sentry.captureException(error);
    try {
        await (0, utils_1.promiseWithTimeout)(connector_1.nodeProvider.closeProviders(), 200, Error('Failed to close proivders!'));
    }
    catch (err) {
        Sentry.captureException(err);
    }
    logger_1.default.error('Finished');
    Sentry.close(2000).then(() => {
        process.exit(-1);
    });
});
//# sourceMappingURL=crawlerV2.js.map