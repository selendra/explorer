"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNativeTokenHolders = exports.processEvmTokenHolders = void 0;
const utils_1 = require("../utils/utils");
const evmEvent_1 = require("./evmEvent");
const utils_2 = require("./utils");
const prepareTokenHolderHead = (evmAddress, nftId, type, { timestamp, address: tokenAddress, contractData, abis, name, }) => ({
    type,
    nftId,
    timestamp,
    evmAddress,
    tokenAddress,
    abi: abis[name],
    info: contractData,
});
const processTokenHolderHead = async (head, balance) => {
    const native = await (0, utils_2.findNativeAddress)(head.evmAddress);
    return {
        ...head,
        balance,
        signerAddress: native,
        evmAddress: native !== '' ? '' : head.evmAddress,
        type: native !== '' ? 'Account' : 'Contract',
    };
};
const base = (from, to, nft, type, log) => [
    prepareTokenHolderHead(to, nft, type, log),
    prepareTokenHolderHead(from, nft, type, log),
];
const evmLogToTokenHolderHead = (log) => {
    if ((0, evmEvent_1.isErc20TransferEvent)(log)) {
        const [from, to] = log.decodedEvent.args;
        return base(from, to, null, 'ERC20', log);
    }
    if ((0, evmEvent_1.isErc721TransferEvent)(log)) {
        const [from, to, nft] = log.decodedEvent.args;
        return base(from, to, nft.toString(), 'ERC721', log);
    }
    if ((0, evmEvent_1.isErc1155TransferSingleEvent)(log)) {
        const [, from, to, nft] = log.decodedEvent.args;
        return base(from, to, nft.toString(), 'ERC1155', log);
    }
    if ((0, evmEvent_1.isErc1155TransferBatchEvent)(log)) {
        const [, from, to, nfts] = log.decodedEvent.args;
        return nfts
            .flatMap((_, index) => base(from, to, nfts[index].toString(), 'ERC1155', log));
    }
    return [];
};
const processEvmTokenHolders = async (evmLogs) => {
    const tokenHolders = (0, utils_1.dropDuplicatesMultiKey)(evmLogs.flatMap(evmLogToTokenHolderHead), ['evmAddress', 'tokenAddress', 'nftId'])
        .filter(({ evmAddress }) => evmAddress !== '0x0000000000000000000000000000000000000000')
        // Balance of function is surrounded by a try-catch statement because every contract can be deleted.
        // If a contract is deleted there is no on-chain data and the old data can not be reached.
        // Therefore we are capturing these events and filtering them out.
        .map(async (head) => {
        try {
            const balance = head.type === 'ERC1155'
                ? await (0, utils_2.balanceOfErc1155)(head.evmAddress, head.tokenAddress, head.nftId, head.abi)
                : await (0, utils_2.balanceOf)(head.evmAddress, head.tokenAddress, head.abi);
            return processTokenHolderHead(head, balance);
        }
        catch (e) {
            return undefined;
        }
    });
    const results = await (0, utils_1.resolvePromisesAsChunks)(tokenHolders);
    return results.filter(utils_1.removeUndefinedItem);
};
exports.processEvmTokenHolders = processEvmTokenHolders;
const processNativeTokenHolders = (accounts) => (0, utils_1.dropDuplicates)(accounts, 'address')
    .map(({ address, timestamp, freeBalance }) => ({
    timestamp,
    signerAddress: address,
    tokenAddress: utils_1.SELENDRA_CONTRACT_ADDRESS,
    info: { ...utils_1.SELENDRA_DEFAULT_DATA },
    balance: freeBalance,
    type: 'Account',
    evmAddress: '',
    nftId: null,
}));
exports.processNativeTokenHolders = processNativeTokenHolders;
//# sourceMappingURL=tokenHolder.js.map