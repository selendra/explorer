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
const Sentry = __importStar(require("@sentry/node"));
const integrations_1 = require("@sentry/integrations");
const config_1 = __importDefault(require("./config"));
const block_1 = __importStar(require("./crawler/block"));
const block_2 = require("./queries/block");
const connector_1 = require("./utils/connector");
const utils_1 = require("./utils/utils");
const logger_1 = __importDefault(require("./utils/logger"));
const contracts_1 = __importDefault(require("./crawler/contracts"));
const syncVerifiedContracts_1 = __importDefault(require("./crawler/syncVerifiedContracts"));
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
const processNextBlock = async () => {
    let BLOCKS_PER_STEP = config_1.default.startBlockSize;
    let currentBlockIndex = await (0, block_2.lastBlockInDatabase)();
    let updateSubContractsCounter = 0;
    let updateVerifiedContracts = 0;
    while (true) {
        const chainHead = connector_1.nodeProvider.lastBlockId();
        const finalizedHead = connector_1.nodeProvider.lastFinalizedBlockId();
        while (currentBlockIndex < finalizedHead) {
            const difference = (0, utils_1.min)(chainHead - currentBlockIndex, BLOCKS_PER_STEP);
            const finalizedDifference = (0, utils_1.min)(finalizedHead - currentBlockIndex, BLOCKS_PER_STEP);
            const from = currentBlockIndex + 1;
            const to = from + finalizedDifference;
            const start = Date.now();
            let transactions = 0;
            connector_1.nodeProvider.setDbBlockId(from + difference - 1);
            // // Processing unfinalized blocks
            transactions += await (0, block_1.processInitialBlocks)(to, from + difference);
            // Processing finalized blocks
            transactions += await (0, block_1.default)(from, to);
            currentBlockIndex = to - 1;
            const ms = Date.now() - start;
            const time = ms / 1000;
            const bps = finalizedDifference / time;
            logger_1.default.info(`n nodes: ${config_1.default.nodeUrls.length}\tn blocks: ${finalizedDifference}\tbps: ${bps.toFixed(3)}\tn transactions: ${transactions}\ttps: ${(transactions / time).toFixed(3)}\ttime: ${time.toFixed(3)} s\tblock from ${from} to ${to}`);
            BLOCKS_PER_STEP = (0, utils_1.min)(BLOCKS_PER_STEP * 2, config_1.default.maxBlocksPerStep);
        }
        // Missing Contracts - Inefficient pattern
        updateSubContractsCounter += 1;
        if (updateSubContractsCounter > config_1.default.subcontractInterval) {
            await (0, contracts_1.default)(finalizedHead);
            updateSubContractsCounter = 0;
        }
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
        await (0, utils_1.wait)(config_1.default.pollInterval);
    }
};
Promise.resolve()
    .then(async () => {
    await connector_1.nodeProvider.initializeProviders();
})
    .then(async () => {
    logger_1.default.info('Removing unfinished blocks...');
    await (0, block_2.deleteUnfinishedBlocks)();
    logger_1.default.info('...success');
})
    .then(() => {
    logger_1.default.info(`Contract verification sync: ${config_1.default.verifiedContractSync}`);
})
    .then(processNextBlock)
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
//# sourceMappingURL=crawler.js.map