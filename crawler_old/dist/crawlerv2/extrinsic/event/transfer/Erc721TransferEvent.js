"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../crawler/utils");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const NftTokenHolderEvent_1 = __importDefault(require("./NftTokenHolderEvent"));
class Erc721TransferEvent extends NftTokenHolderEvent_1.default {
    constructor() {
        super(...arguments);
        this.name = 'ERC721';
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        logger_1.default.info('Processing Erc721 transfer event');
        const tokenAddress = this.contract.address;
        const [from, to, nftID] = this.data.parsed.args;
        const abi = this.contract.compiled_data[this.contract.name];
        const nftId = nftID.toString();
        const toEvmAddress = to.toString();
        const fromEvmAddress = from.toString();
        const toAddress = await accountsManager.useEvm(toEvmAddress);
        const fromAddress = await accountsManager.useEvm(fromEvmAddress);
        logger_1.default.info(`Processing ERC721: ${this.contract.address} transfer from ${fromAddress} to ${toAddress}`);
        this.transfers.push({
            amount: '1',
            blockId: this.head.blockId,
            toAddress,
            fromAddress,
            fromEvmAddress,
            timestamp: this.head.timestamp,
            toEvmAddress,
            tokenAddress,
            type: 'ERC721',
            denom: this.contract.contract_data?.symbol,
            nftId,
        });
        if (toAddress !== '0x') {
            const toBalance = await (0, utils_1.balanceOf)(toEvmAddress, tokenAddress, abi);
            this.addTokenHolder(toAddress, toEvmAddress, toBalance, nftId);
        }
        if (fromAddress !== '0x') {
            const fromBalance = await (0, utils_1.balanceOf)(fromEvmAddress, tokenAddress, abi);
            this.addTokenHolder(fromAddress, fromEvmAddress, fromBalance, nftId);
        }
    }
}
exports.default = Erc721TransferEvent;
//# sourceMappingURL=Erc721TransferEvent.js.map