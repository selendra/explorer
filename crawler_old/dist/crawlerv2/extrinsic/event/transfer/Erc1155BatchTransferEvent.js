"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const connector_1 = require("../../../../utils/connector");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const DefaultErcTransferEvent_1 = __importDefault(require("./DefaultErcTransferEvent"));
class Erc1155BatchTransferEvent extends DefaultErcTransferEvent_1.default {
    async balanceOfBatch(address, tokenAddress, ids) {
        const contract = new ethers_1.Contract(tokenAddress, this.contract.compiled_data[this.contract.name], connector_1.nodeProvider.getProvider());
        const result = await contract.balanceOfBatch(Array(ids.length).fill(address), ids);
        return result.map((amount) => amount.toString());
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        logger_1.default.info('Processing Erc1155 batch transfer event');
        const [, fromEvmAddress, toEvmAddress, nftIds, amounts] = this.data.parsed.args;
        const tokenAddress = this.contract.address;
        const toAddress = await accountsManager.useEvm(toEvmAddress);
        const fromAddress = await accountsManager.useEvm(fromEvmAddress);
        const toBalances = await this.balanceOfBatch(toEvmAddress, tokenAddress, nftIds);
        const fromBalances = await this.balanceOfBatch(fromEvmAddress, tokenAddress, nftIds);
        logger_1.default.info(`Processing ERC1155: ${this.contract.address} batch transfer from ${fromAddress} to ${toAddress} -> \n\tIds: ${nftIds}\n]\tAmounts: ${amounts}`);
        for (let index = 0; index < nftIds.length; index++) {
            // Adding transe
            this.transfers.push({
                blockId: this.head.blockId,
                fromEvmAddress,
                timestamp: this.head.timestamp,
                toEvmAddress,
                tokenAddress,
                type: 'ERC1155',
                denom: this.contract.contract_data?.symbol,
                nftId: nftIds[index].toString(),
                amount: amounts[index].toString(),
                toAddress,
                fromAddress,
            });
            this.addTokenHolder(toAddress, toEvmAddress, toBalances[index], nftIds[index].toString());
            this.addTokenHolder(fromAddress, fromEvmAddress, fromBalances[index], nftIds[index].toString());
        }
    }
}
exports.default = Erc1155BatchTransferEvent;
//# sourceMappingURL=Erc1155BatchTransferEvent.js.map