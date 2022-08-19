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
const pool_1 = __importDefault(require("./pool"));
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
Sentry.setTag('component', 'pools');
Sentry.setTag('network', config_1.default.network);
const getFirstQueryValue = async (statement, args = []) => {
    const res = await (0, connector_1.queryv2)(statement, args);
    if (res.length === 0) {
        throw new Error(`Query was empty: \n\t${statement}\narguments: \n\t ${args}`);
    }
    return res[0];
};
const findPoolEvent = async (evmEventId) => (0, connector_1.queryv2)('SELECT id FROM pool_event WHERE evm_event_id = $1;', [evmEventId]);
const getCurrentPoolPointer = async () => (await getFirstQueryValue('SELECT last_value as currval FROM pool_event_sequence')).currval;
const getNextPoolPointer = async () => (await getFirstQueryValue('SELECT nextval(\'pool_event_sequence\');')).nextval;
const checkIfEventExists = async (id) => {
    const event = await (0, connector_1.queryv2)('SELECT id FROM evm_event WHERE id = $1;', [id]);
    return event.length > 0;
};
const checkIfPoolEventExists = async (id) => {
    const events = await findPoolEvent(id);
    return events.length > 0;
};
const findInitialIndex = async () => {
    let currentEvmEventPointer = await getCurrentPoolPointer();
    // Initializion with current evm event pointer to make sure last pool event was written in DB
    while (await checkIfPoolEventExists(currentEvmEventPointer)) {
        currentEvmEventPointer = await getNextPoolPointer();
    }
    return currentEvmEventPointer;
};
const isCurrentPointerInGap = async (id) => {
    const events = await (0, connector_1.queryv2)('SELECT id FROM evm_event WHERE id > $1 LIMIT 1;', [id]);
    return events.length > 0;
};
const poolEvents = async () => {
    let currentEvmEventPointer = await findInitialIndex();
    while (true) {
        // If evm event does not exist wait for one second and retry
        if (await checkIfEventExists(currentEvmEventPointer)) {
            // process evm evnt pointer
            await (0, pool_1.default)(currentEvmEventPointer);
            currentEvmEventPointer = await getNextPoolPointer();
        }
        else if (await isCurrentPointerInGap(currentEvmEventPointer)) {
            currentEvmEventPointer = await getNextPoolPointer();
        }
        else {
            await (0, utils_1.wait)(1000);
        }
    }
};
Promise.resolve()
    .then(async () => {
    await connector_1.nodeProvider.initializeProviders();
    logger_1.default.info(`Factory address used: ${config_1.default.selendraswapFactoryAddress}`);
})
    .then(poolEvents)
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
//# sourceMappingURL=pool.js.map