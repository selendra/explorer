"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInitialBlocks = void 0;
const connector_1 = require("../utils/connector");
const block_1 = require("../queries/block");
const extrinsic_1 = require("./extrinsic");
const extrinsic_2 = require("../queries/extrinsic");
const event_1 = require("../queries/event");
const event_2 = require("./event");
const utils_1 = require("../utils/utils");
const evmEvent_1 = require("./evmEvent");
const evmEvent_2 = require("../queries/evmEvent");
const logger_1 = __importDefault(require("../utils/logger"));
const staking_1 = require("./staking");
const tokenHoldes_1 = __importDefault(require("../queries/tokenHoldes"));
const transfer_1 = require("./transfer");
const tokenHolder_1 = require("./tokenHolder");
const blockHash = async (id) => {
    const hash = await connector_1.nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(id));
    return { id, hash };
};
const blockBody = async ({ id, hash }) => {
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
// TODO move in queries/block.ts
const blockBodyToInsert = ({ id, hash, extendedHeader, signedBlock, timestamp, }) => ({
    id,
    timestamp,
    finalized: false,
    hash: hash.toString(),
    author: extendedHeader?.author?.toString() || '',
    parentHash: signedBlock.block.header.parentHash.toString(),
    stateRoot: signedBlock.block.header.stateRoot.toString(),
    extrinsicRoot: signedBlock.block.header.extrinsicsRoot.toString(),
});
const blockToExtrinsicsHeader = ({ id, signedBlock, events, timestamp, }) => signedBlock.block.extrinsics.map((extrinsic, index) => ({
    index,
    extrinsic,
    timestamp,
    blockId: id,
    events: events.filter((0, event_2.isExtrinsicEvent)(index)),
    status: (0, extrinsic_1.extrinsicStatus)(events),
}));
const getSignedExtrinsicData = async (extrinsicHash) => {
    const [fee, feeDetails] = await Promise.all([
        connector_1.nodeProvider.query((provider) => provider.api.rpc.payment.queryInfo(extrinsicHash)),
        connector_1.nodeProvider.query((provider) => provider.api.rpc.payment.queryFeeDetails(extrinsicHash)),
    ]);
    return {
        fee: fee.toJSON(),
        feeDetails: feeDetails.toJSON(),
    };
};
const extrinsicBody = (nextFreeId) => async (extrinsicHead, index) => ({
    ...extrinsicHead,
    id: nextFreeId + index,
    signedData: extrinsicHead.extrinsic.isSigned
        ? await getSignedExtrinsicData(extrinsicHead.extrinsic.toHex())
        : undefined,
});
const extrinsicToInsert = ({ id, extrinsic, signedData, blockId, events, timestamp, index, }) => {
    const status = (0, extrinsic_1.extrinsicStatus)(events);
    const { hash, method, args, meta, } = extrinsic;
    return {
        id,
        index,
        blockId,
        signedData,
        timestamp,
        status: status.type,
        hash: hash.toString(),
        method: method.method,
        section: method.section,
        signed: (0, extrinsic_1.resolveSigner)(extrinsic),
        args: JSON.stringify(args),
        docs: meta.docs.toLocaleString(),
        errorMessage: status.type === 'error' ? status.message : '',
    };
};
const eventToBody = (nextFreeId) => (event, index) => ({
    id: nextFreeId + index,
    ...event,
});
const initialBlockToInsert = ({ id, hash }) => ({
    id,
    finalized: false,
    hash: hash.toString(),
    timestamp: `${new Date().toUTCString()}`,
    author: '',
    parentHash: '',
    stateRoot: '',
    extrinsicRoot: '',
});
const processInitialBlocks = async (fromId, toId) => {
    if (toId - fromId <= 0) {
        return 0;
    }
    logger_1.default.info(`New unfinalized heads detected from ${fromId} to ${toId}`);
    let transactions = 0;
    const blockIds = (0, utils_1.range)(fromId, toId);
    connector_1.nodeProvider.setDbBlockId(toId - 1);
    logger_1.default.info('Retrieving unfinished block hashes');
    transactions += blockIds.length;
    const hashes = await (0, utils_1.resolvePromisesAsChunks)(blockIds.map(blockHash));
    // Insert blocks
    logger_1.default.info('Inserting unfinished blocks in DB');
    await (0, block_1.insertMultipleBlocks)(hashes.map(initialBlockToInsert));
    return transactions;
};
exports.processInitialBlocks = processInitialBlocks;
exports.default = async (fromId, toId, save = true) => {
    let transactions = 0;
    const blockIds = (0, utils_1.range)(fromId, toId);
    connector_1.nodeProvider.setDbBlockId(toId - 1);
    logger_1.default.info('Retrieving block hashes');
    transactions += blockIds.length * 2;
    const provider = connector_1.nodeProvider.getProvider();
    const blockHashes = await Promise.all(blockIds.map((id) => provider.api.rpc.chain.getBlockHash(id)));
    const hashes = blockIds.map((id, i) => ({
        id,
        hash: blockHashes[i],
    }));
    logger_1.default.info('Retrieving block bodies');
    let blocks = await Promise.all(hashes.map(blockBody));
    // Insert blocks
    if (save) {
        logger_1.default.info('Inserting initial blocks in DB');
        await (0, block_1.insertMultipleBlocks)(blocks.map(blockBodyToInsert));
    }
    // Extrinsics
    logger_1.default.info('Extracting and compressing blocks extrinsics');
    let extrinsicHeaders = blocks.map(blockToExtrinsicsHeader).flat();
    logger_1.default.info('Retrieving next free extrinsic and event ids');
    const [eid, feid] = await (0, extrinsic_2.nextFreeIds)();
    logger_1.default.info(`Extrinsic next id: ${eid}, Event next id: ${feid}`);
    logger_1.default.info('Retrieving neccessery extrinsic data');
    transactions += extrinsicHeaders.length;
    const extrinsics = await (0, utils_1.resolvePromisesAsChunks)(extrinsicHeaders.map(extrinsicBody(feid)));
    // Free memory
    blocks = [];
    extrinsicHeaders = [];
    // Events
    logger_1.default.info('Extracting and compressing extrinisc events');
    const events = extrinsics
        .flatMap(event_2.extrinsicToEventHeader)
        .map(eventToBody(eid));
    if (save) {
        logger_1.default.info('Inserting extriniscs');
        await (0, extrinsic_2.insertExtrinsics)(extrinsics.map(extrinsicToInsert));
        logger_1.default.info('Inserting events');
        await (0, event_1.insertEvents)(events);
    }
    // Staking
    logger_1.default.info('Resolving staking events');
    const staking = await (0, utils_1.resolvePromisesAsChunks)(events
        .filter(event_2.isEventStakingReward)
        .map((e) => (0, staking_1.processStakingEvent)({
        ...e,
        data: [
            e.event.event.data[0].toString(),
            e.event.event.data[1].toString(),
        ],
    })));
    // Transfers
    logger_1.default.info('Extracting native transfers');
    let transfers = await (0, utils_1.resolvePromisesAsChunks)(events.filter(transfer_1.isTransferEvent).map(transfer_1.processTransferEvent));
    // EVM Logs
    logger_1.default.info('Retrieving EVM log if contract is ERC20 token');
    const evmLogs = await (0, evmEvent_1.extrinsicToEvmLogs)(extrinsics);
    transactions += evmLogs.length;
    // Token Transfers
    logger_1.default.info('Extracting token transfer');
    let tokenTransfers = await (0, transfer_1.processTokenTransfers)(evmLogs);
    transactions += tokenTransfers.length;
    transfers.push(...tokenTransfers);
    tokenTransfers = [];
    // Evm Token Holders
    logger_1.default.info('Extracting EVM token holders');
    const tokenHolders = await (0, tokenHolder_1.processEvmTokenHolders)(evmLogs);
    transactions += tokenHolders.length;
    // Accounts
    logger_1.default.info('Compressing transfer, event accounts, evm claim account');
    const allAccounts = [];
    allAccounts.push(...transfers.flatMap(transfer_1.extractTransferAccounts));
    allAccounts.push(...events.flatMap(event_2.accountNewOrKilled));
    allAccounts.push(...staking.map(staking_1.stakingToAccount));
    allAccounts.push(...extrinsics
        .filter(evmEvent_1.isExtrinsicEvmClaimAccount)
        .flatMap(evmEvent_1.extrinsicToEvmClaimAccount));
    logger_1.default.info('Extracting, compressing and dropping duplicate accounts');
    let insertOrDeleteAccount = (0, utils_1.dropDuplicates)(allAccounts, 'address').filter(({ address }) => address.length === 49);
    logger_1.default.info('Retrieving used account info');
    transactions += insertOrDeleteAccount.length;
    let accounts = await (0, utils_1.resolvePromisesAsChunks)(insertOrDeleteAccount.map(event_2.accountHeadToBody));
    insertOrDeleteAccount = [];
    // Native token holders
    logger_1.default.info('Extracting native token holders from accounts');
    tokenHolders.push(...(0, tokenHolder_1.processNativeTokenHolders)(accounts));
    if (save) {
        logger_1.default.info('Inserting or updating accounts');
        await (0, event_1.insertAccounts)(accounts);
        // Free memory
        accounts = [];
        // Staking Reward
        logger_1.default.info('Inserting staking rewards');
        await (0, staking_1.insertStaking)(staking);
        // Transfers
        logger_1.default.info('Inserting transfers');
        await (0, extrinsic_2.insertTransfers)(transfers);
        transfers = [];
        // Contracts
        logger_1.default.info('Extracting new contracts');
        let contracts = extrinsics
            .filter(evmEvent_1.isExtrinsicEVMCreate)
            .map(evmEvent_1.extrinsicToContract);
        logger_1.default.info('Inserting contracts');
        await (0, evmEvent_2.insertContracts)(contracts);
        contracts = [];
        logger_1.default.info('Inserting evm events');
        await (0, evmEvent_2.insertEvmEvents)(events);
        // Token holders
        await (0, tokenHoldes_1.default)(tokenHolders);
        logger_1.default.info('Finalizing blocks');
        await (0, block_1.updateBlocksFinalized)(fromId, toId);
    }
    logger_1.default.info('Complete!');
    return transactions;
};
//# sourceMappingURL=block.js.map