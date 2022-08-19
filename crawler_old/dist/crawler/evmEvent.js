"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErc1155TransferBatchEvent = exports.isErc1155TransferSingleEvent = exports.isErc721TransferEvent = exports.isErc20TransferEvent = exports.extrinsicToEvmLogs = exports.eventToEvmLog = exports.extrinsicToContract = exports.extrinsicToEvmClaimAccount = exports.isEventEvmLog = exports.isExtrinsicEVMCall = exports.isExtrinsicEvmClaimAccount = exports.isExtrinsicEVMCreate = void 0;
const ethers_1 = require("ethers");
const connector_1 = require("../utils/connector");
const evmEvent_1 = require("../queries/evmEvent");
const utils_1 = require("../utils/utils");
const preprocessBytecode = (bytecode) => {
    const start = bytecode.indexOf('6080604052');
    const end = bytecode.indexOf('a265627a7a72315820') !== -1
        ? bytecode.indexOf('a265627a7a72315820')
        : bytecode.indexOf('a264697066735822');
    return {
        context: bytecode.slice(start, end),
        args: bytecode.slice(end),
    };
};
const findContractEvent = (events) => events.find(({ event }) => event.section === 'evm' && event.method === 'Created');
const isExtrinsicEVMCreate = ({ extrinsic: { method }, events, }) => method.section === 'evm'
    && method.method === 'create'
    && !!findContractEvent(events);
exports.isExtrinsicEVMCreate = isExtrinsicEVMCreate;
const isExtrinsicEvmClaimAccount = ({ extrinsic: { method: { section, method }, }, }) => section === 'evmAccounts' && method === 'claimDefaultAccount';
exports.isExtrinsicEvmClaimAccount = isExtrinsicEvmClaimAccount;
const isExtrinsicEVMCall = ({ extrinsic: { method }, }) => method.section === 'evm' && method.method === 'call';
exports.isExtrinsicEVMCall = isExtrinsicEVMCall;
const isEventEvmLog = ({ event: { event: { method, section } } }) => method === 'Log' && section === 'evm';
exports.isEventEvmLog = isEventEvmLog;
const extrinsicToEvmClaimAccount = ({ events, blockId, timestamp, }) => {
    const [address] = events[0].event.data;
    return [{
            blockId, address: address.toString(), active: true, timestamp,
        }];
};
exports.extrinsicToEvmClaimAccount = extrinsicToEvmClaimAccount;
const extrinsicToContract = ({ extrinsic, events, id, timestamp, }) => {
    const { args } = extrinsic;
    const contractEvent = findContractEvent(events);
    const address = (0, utils_1.toChecksumAddress)(contractEvent.event.data[0].toString());
    const reserveEvent = events.find((evn) => connector_1.nodeProvider.getProvider().api.events.balances.Reserved.is(evn.event));
    const signer = reserveEvent.event.data[0].toString();
    const bytecode = args[0].toString();
    const gasLimit = args[2].toString();
    const storageLimit = args[3].toString();
    const { context: bytecodeContext, args: bytecodeArguments } = preprocessBytecode(bytecode);
    return {
        signer,
        address,
        bytecode,
        gasLimit,
        timestamp,
        storageLimit,
        bytecodeContext,
        extrinsicId: id,
        bytecodeArguments,
    };
};
exports.extrinsicToContract = extrinsicToContract;
const eventToEvmLog = ({ event }) => {
    const bl = event.data.toJSON()[0];
    bl.address = (0, utils_1.toChecksumAddress)(bl.address);
    return bl;
};
exports.eventToEvmLog = eventToEvmLog;
const extractEvmLog = async (event) => {
    const result = await (0, evmEvent_1.getContractDB)(event.address);
    if (result.length === 0) {
        return undefined;
    }
    const verifiedContract = result[0];
    return {
        ...event,
        name: verifiedContract?.name,
        abis: verifiedContract?.compiled_data,
        type: verifiedContract?.type,
        contractData: verifiedContract?.contract_data,
    };
};
const decodeEvmLog = (event) => {
    const { abis, data, name, topics, } = event;
    const abi = new ethers_1.utils.Interface(abis[name]);
    const result = abi.parseLog({ topics, data });
    return { ...event, decodedEvent: result };
};
const extrToEvmLog = ({ events, blockId, timestamp, id, signedData, }) => events
    .map((event) => ({
    event, blockId, timestamp, extrinsicId: id, signedData,
}));
const extrinsicToEvmLogs = async (extrinsicEvmCalls) => {
    const baseEvmLogs = extrinsicEvmCalls
        .flatMap(extrToEvmLog)
        .filter(exports.isEventEvmLog)
        .map(({ event, blockId, timestamp, extrinsicId, signedData, }) => {
        const a = event.event.data.toJSON()[0];
        a.address = (0, utils_1.toChecksumAddress)(a.address);
        return {
            ...a, timestamp, blockId, extrinsicId, signedData,
        };
    })
        // only returns verified contract logs
        .map(extractEvmLog);
    const decodedEvmData = await (0, utils_1.resolvePromisesAsChunks)(baseEvmLogs);
    return decodedEvmData
        .filter(utils_1.removeUndefinedItem)
        .map(decodeEvmLog);
};
exports.extrinsicToEvmLogs = extrinsicToEvmLogs;
const isErc20TransferEvent = ({ decodedEvent, type }) => decodedEvent.name === 'Transfer' && type === 'ERC20';
exports.isErc20TransferEvent = isErc20TransferEvent;
const isErc721TransferEvent = ({ decodedEvent, type }) => decodedEvent.name === 'Transfer' && type === 'ERC721';
exports.isErc721TransferEvent = isErc721TransferEvent;
const isErc1155TransferSingleEvent = ({ decodedEvent, type }) => decodedEvent.name === 'TransferSingle' && type === 'ERC1155';
exports.isErc1155TransferSingleEvent = isErc1155TransferSingleEvent;
const isErc1155TransferBatchEvent = ({ decodedEvent, type }) => decodedEvent.name === 'TransferBatch' && type === 'ERC1155';
exports.isErc1155TransferBatchEvent = isErc1155TransferBatchEvent;
//# sourceMappingURL=evmEvent.js.map