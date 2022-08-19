"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTransferEvent = exports.isTransferEvent = exports.extractTransferAccounts = exports.processTokenTransfers = void 0;
const ethers_1 = require("ethers");
const connector_1 = require("../utils/connector");
const utils_1 = require("../utils/utils");
const evmEvent_1 = require("./evmEvent");
const utils_2 = require("./utils");
const evmLogToTransfer = async ({ timestamp, address, blockId, extrinsicId, signedData, }, fromEvmAddress, toEvmAddress) => {
    const [toAddress, fromAddress] = await Promise.all([
        (0, utils_2.findNativeAddress)(toEvmAddress),
        (0, utils_2.findNativeAddress)(fromEvmAddress),
    ]);
    return {
        blockId,
        timestamp,
        extrinsicId,
        toEvmAddress,
        success: true,
        fromEvmAddress,
        errorMessage: '',
        tokenAddress: address,
        toAddress: toAddress === '' ? 'null' : toAddress,
        fromAddress: fromAddress === '' ? 'null' : fromAddress,
        feeAmount: ethers_1.BigNumber.from(signedData.fee.partialFee).toString(),
        amount: '0',
        type: 'ERC20',
    };
};
const erc20EvmLogToTransfer = async (log) => {
    const [from, to, amount] = log.decodedEvent.args;
    const base = await evmLogToTransfer(log, from, to);
    return [{
            ...base,
            type: 'ERC20',
            amount: amount.toString(),
            denom: log.contractData?.symbol,
        }];
};
const erc721EvmLogToTransfer = async (log) => {
    const [from, to, nftId] = log.decodedEvent.args;
    const base = await evmLogToTransfer(log, from, to);
    return [{
            ...base,
            type: 'ERC721',
            nftId: nftId.toString(),
        }];
};
const erc1155SingleEvmLogToTransfer = async (log) => {
    const [, from, to, nftId, amount] = log.decodedEvent.args;
    const base = await evmLogToTransfer(log, from, to);
    return [{
            ...base,
            type: 'ERC1155',
            nftId: nftId.toString(),
            amount: amount.toString(),
        }];
};
const erc1155BatchEvmLogToTransfer = async (log) => {
    const [, from, to, nftIds, amounts] = log.decodedEvent.args;
    const base = await evmLogToTransfer(log, from, to);
    return nftIds.map((_, index) => ({
        ...base,
        type: 'ERC1155',
        nftId: nftIds[index].toString(),
        amount: amounts[index].toString(),
    }));
};
const processTokenTransfers = async (evmLogs) => {
    const transfers = evmLogs
        .map(async (log) => {
        if ((0, evmEvent_1.isErc20TransferEvent)(log)) {
            return erc20EvmLogToTransfer(log);
        }
        if ((0, evmEvent_1.isErc721TransferEvent)(log)) {
            return erc721EvmLogToTransfer(log);
        }
        if ((0, evmEvent_1.isErc1155TransferSingleEvent)(log)) {
            return erc1155SingleEvmLogToTransfer(log);
        }
        if ((0, evmEvent_1.isErc1155TransferBatchEvent)(log)) {
            return erc1155BatchEvmLogToTransfer(log);
        }
        return Promise.resolve([]);
    });
    const result = await (0, utils_1.resolvePromisesAsChunks)(transfers);
    return result.flat();
};
exports.processTokenTransfers = processTokenTransfers;
// Assigning that the account is active is a temporary solution!
// The correct way would be to first query db if account exists
// If it does not and if transfer has failed then the account is not active.
// The query can be skipped if we would have complete
// list available in function (dynamic programming)
const extractTransferAccounts = ({ fromAddress, toAddress, blockId, timestamp, }) => [
    {
        blockId, address: fromAddress, active: true, timestamp,
    },
    {
        blockId, address: toAddress, active: true, timestamp,
    },
];
exports.extractTransferAccounts = extractTransferAccounts;
const isTransferEvent = ({ event: { event } }) => connector_1.nodeProvider.getProvider().api.events.balances.Transfer.is(event);
exports.isTransferEvent = isTransferEvent;
const processTransferEvent = async ({ event: { event: { data } }, status, signedData, extrinsicId, blockId, timestamp, }) => {
    const [fromAddress, toAddress, amount] = data;
    const [toEvmAddress, fromEvmAddress] = await Promise.all([
        connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.evmAddresses(toAddress)),
        connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.evmAddresses(fromAddress)),
    ]);
    const feeAmount = ethers_1.BigNumber.from(signedData.fee.partialFee).toString();
    return {
        amount: amount.toString(),
        blockId,
        feeAmount,
        timestamp,
        extrinsicId,
        tokenAddress: utils_1.SELENDRA_CONTRACT_ADDRESS,
        toAddress: toAddress.toString(),
        fromAddress: fromAddress.toString(),
        toEvmAddress: toEvmAddress.toString(),
        fromEvmAddress: fromEvmAddress.toString(),
        denom: 'SEL',
        type: 'Native',
        success: status.type === 'success',
        errorMessage: status.type === 'error' ? status.message : '',
    };
};
exports.processTransferEvent = processTransferEvent;
//# sourceMappingURL=transfer.js.map