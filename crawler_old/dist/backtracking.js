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
const connector_1 = require("./utils/connector");
const logger_1 = __importDefault(require("./utils/logger"));
const config_1 = __importDefault(require("./config"));
const utils_1 = require("./utils/utils");
const backtracking_1 = __importDefault(require("./backtracking/"));
/* eslint "no-underscore-dangle": "off" */
Sentry.init({
    dsn: config_1.default.sentryBacktrackingDns,
    tracesSampleRate: 1.0,
    integrations: [
        new integrations_1.RewriteFrames({
            root: global.__dirname,
        }),
    ],
    environment: config_1.default.environment,
});
Sentry.setTag('component', 'backtracking');
Sentry.setTag('network', config_1.default.network);
const backtrackEvents = async () => {
    while (true) {
        // Get contract from newly verificated contract table
        const contracts = await (0, connector_1.queryv2)('SELECT address FROM newly_verified_contract_queue');
        for (let contractIndex = 0; contractIndex < contracts.length; contractIndex += 1) {
            // Process contract events & store them
            const { address } = contracts[contractIndex];
            await (0, backtracking_1.default)(address);
            await (0, connector_1.queryv2)('DELETE FROM newly_verified_contract_queue WHERE address = $1;', [address]);
        }
        await (0, utils_1.wait)(1000);
    }
};
Promise.resolve()
    .then(async () => {
    await connector_1.nodeProvider.initializeProviders();
})
    .then(backtrackEvents)
    .then(async () => {
    await connector_1.nodeProvider.closeProviders();
    logger_1.default.info('Finished');
    process.exit();
})
    .catch(async (error) => {
    logger_1.default.error(error);
    Sentry.captureException(error);
    await connector_1.nodeProvider.closeProviders();
    logger_1.default.error('Finished');
    Sentry
        .close(2000)
        .then(() => process.exit(-1));
});
//# sourceMappingURL=backtracking.js.map