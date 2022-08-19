"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUnfinalizedBlock = void 0;
const block_1 = require("../queries/block");
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const event_1 = __importDefault(require("./extrinsic/event"));
const Extrinsic_1 = __importDefault(require("./extrinsic/Extrinsic"));
const AccountManager_1 = __importDefault(require("./managers/AccountManager"));
const blockBody = async (id, hash) => {
    const provider = connector_1.nodeProvider.getProvider();
    const [signedBlock, extendedHeader, events] = await Promise.all([
        provider.api.rpc.chain.getBlock(hash),
        provider.api.derive.chain.getHeader(hash),
        provider.api.query.system.events.at(hash),
    ]);
    // Parse the timestamp from the `timestamp.set` extrinsic
    const firstExtrinsic = signedBlock.block.extrinsics[0];
    let timestamp;
    if (firstExtrinsic
        && firstExtrinsic.method.section === 'timestamp'
        && firstExtrinsic.method.method === 'set') {
        timestamp = new Date(Number(firstExtrinsic.method.args)).toUTCString();
    }
    else {
        timestamp = await provider.api.query.timestamp.now.at(hash);
        timestamp = new Date(timestamp.toJSON()).toUTCString();
    }
    return {
        id,
        hash,
        signedBlock,
        extendedHeader,
        events,
        timestamp,
    };
};
const reduceExtrinsicEvents = (acc, event) => {
    if (event.head.event.phase.isApplyExtrinsic) {
        const eventExtrinsic = event.head.event.phase.asApplyExtrinsic.toNumber();
        if (!acc[eventExtrinsic]) {
            acc[eventExtrinsic] = [];
        }
        acc[eventExtrinsic].push(event);
    }
    return acc;
};
const formateBlockBody = ({ id, hash, extendedHeader, signedBlock, timestamp, }) => ({
    id,
    timestamp,
    finalized: false,
    hash: hash.toString(),
    author: extendedHeader?.author?.toString() || '',
    parentHash: signedBlock.block.header.parentHash.toString(),
    stateRoot: signedBlock.block.header.stateRoot.toString(),
    extrinsicRoot: signedBlock.block.header.extrinsicsRoot.toString(),
});
const formatUnfinalizedBlock = (id, hash) => ({
    id,
    finalized: false,
    hash: hash.toString(),
    timestamp: `${new Date().toUTCString()}`,
    author: '',
    parentHash: '',
    stateRoot: '',
    extrinsicRoot: '',
});
const waitForBlockToFinish = async (id) => {
    let res = await (0, connector_1.queryv2)('SELECT id FROM block WHERE id = $1 AND finalized = true;', [id]);
    while (res.length === 0) {
        res = await (0, connector_1.queryv2)('SELECT id FROM block WHERE id = $1 AND finalized = true;', [id]);
    }
};
const processUnfinalizedBlock = async (id) => {
    logger_1.default.info(`New unfinalized head detected ${id}`);
    const hash = await connector_1.nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(id));
    // Insert blocks
    logger_1.default.info('Inserting unfinalized block');
    await (0, block_1.insertBlock)(formatUnfinalizedBlock(id, hash));
};
exports.processUnfinalizedBlock = processUnfinalizedBlock;
const processBlock = async (blockId) => {
    logger_1.default.info('--------------------------------');
    // Load block hash
    logger_1.default.info(`Loading block hash for: ${blockId}`);
    const hash = await connector_1.nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(blockId));
    // Load block
    logger_1.default.info(`Loading block for: ${blockId}`);
    const block = await blockBody(blockId, hash);
    // Inserting initial block and marking it as unfinalized
    logger_1.default.info(`Inserting unfinalized block: ${blockId}`);
    await (0, block_1.insertBlock)(formateBlockBody(block));
    // Storing events for each extrinsic
    logger_1.default.info('Resolving events & mapping them to extrinsic');
    const events = await Promise.all(block.events.map(async (event, index) => (0, event_1.default)({
        blockId,
        event,
        index,
        timestamp: block.timestamp,
    })));
    const mappedEvents = events.reduce(reduceExtrinsicEvents, {});
    const accountManager = new AccountManager_1.default(blockId, block.timestamp);
    logger_1.default.info('Resolving extrinsics');
    const extrinsics = block.signedBlock.block.extrinsics.map((extr, index) => new Extrinsic_1.default(blockId, index, block.timestamp, extr, mappedEvents[index]));
    logger_1.default.info('Processing extrinsics & events');
    await Promise.all(extrinsics.map(async (extrinisc) => extrinisc.process(accountManager)));
    logger_1.default.info('Waiting for the previous block to finish');
    await waitForBlockToFinish(blockId - 1);
    // First saving all used accounts
    await accountManager.save();
    // Chain saving all extrinsic and events
    logger_1.default.info('Saving extrinsic & their events');
    await Promise.all(extrinsics.map(async (extrinisc) => extrinisc.save()));
    // Updating block finalization
    logger_1.default.info(`Finalizing block ${blockId}`);
    await (0, block_1.updateBlockFinalized)(blockId);
};
exports.default = processBlock;
//# sourceMappingURL=block.js.map