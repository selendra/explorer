"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../crawler/utils");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const DefaultErcTransferEvent_1 = __importDefault(require("./DefaultErcTransferEvent"));
class Erc1155SingleTransferEvent extends DefaultErcTransferEvent_1.default {
    async process(accountsManager) {
        await super.process(accountsManager);
        logger_1.default.info('Processing Erc1155 single transfer event');
        const [, fromEvmAddress, toEvmAddress, nftId, amount] = this.data.parsed.args;
        const abi = this.contract.compiled_data[this.contract.name];
        const tokenAddress = this.contract.address;
        const toAddress = await accountsManager.useEvm(toEvmAddress);
        const fromAddress = await accountsManager.useEvm(fromEvmAddress);
        logger_1.default.info(`Processing ERC1155: ${this.contract.address} single transfer from ${fromAddress} to ${toAddress} -> Id: ${nftId.toString()} Amount: ${amount.toString()}`);
        this.transfers.push({
            blockId: this.head.blockId,
            timestamp: this.head.timestamp,
            toAddress,
            fromAddress,
            fromEvmAddress,
            toEvmAddress,
            tokenAddress,
            denom: this.contract.contract_data?.symbol,
            type: 'ERC1155',
            nftId: nftId.toString(),
            amount: amount.toString(),
        });
        if (toAddress !== '0x') {
            const toBalance = await (0, utils_1.balanceOfErc1155)(toEvmAddress, tokenAddress, nftId, abi);
            this.addTokenHolder(toAddress, toEvmAddress, toBalance, nftId.toString());
        }
        if (fromAddress !== '0x') {
            const fromBalance = await (0, utils_1.balanceOfErc1155)(fromEvmAddress, tokenAddress, nftId, abi);
            this.addTokenHolder(fromAddress, fromEvmAddress, fromBalance, nftId.toString());
        }
    }
}
exports.default = Erc1155SingleTransferEvent;
//# sourceMappingURL=Erc1155SingleTransferEvent.js.map