"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../crawler/utils");
const tokenHoldes_1 = require("../../../../queries/tokenHoldes");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const utils_2 = require("../../../../utils/utils");
const DefaultErcTransferEvent_1 = __importDefault(require("./DefaultErcTransferEvent"));
class Erc20TransferEvent extends DefaultErcTransferEvent_1.default {
    constructor() {
        super(...arguments);
        this.accountTokenHolders = [];
        this.contractTokenHolders = [];
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        logger_1.default.info('Processing Erc20 transfer event');
        const [from, to, amount] = this.data.parsed.args;
        const toEvmAddress = to.toString();
        const fromEvmAddress = from.toString();
        const tokenAddress = this.contract.address;
        const abi = this.contract.compiled_data[this.contract.name];
        // Resolving accounts
        const toAddress = await accountsManager.useEvm(toEvmAddress);
        const fromAddress = await accountsManager.useEvm(fromEvmAddress);
        logger_1.default.info(`Processing ERC20: ${this.contract.address} transfer from ${fromAddress} to ${toAddress} -> ${amount.toString()}`);
        this.transfers.push({
            type: 'ERC20',
            toEvmAddress,
            tokenAddress,
            fromEvmAddress,
            blockId: this.head.blockId,
            timestamp: this.head.timestamp,
            amount: amount.toString(),
            denom: this.contract.contract_data?.symbol,
            toAddress,
            fromAddress,
        });
        if (toAddress !== '0x') {
            const toBalance = await (0, utils_1.balanceOf)(toEvmAddress, tokenAddress, abi);
            this.addTokenHolder(toAddress, toEvmAddress, toBalance);
        }
        if (fromAddress !== '0x') {
            const fromBalance = await (0, utils_1.balanceOf)(fromEvmAddress, tokenAddress, abi);
            this.addTokenHolder(fromAddress, fromEvmAddress, fromBalance);
        }
    }
    async save(extrinsicData) {
        await super.save(extrinsicData);
        const accounts = (0, utils_2.dropDuplicatesMultiKey)(this.accountTokenHolders, ['tokenAddress', 'signerAddress']);
        const contracts = (0, utils_2.dropDuplicatesMultiKey)(this.accountTokenHolders, ['tokenAddress', 'evmAddress']);
        // Saving account token holders and displaying updated holders and signers
        if (accounts.length > 0) {
            logger_1.default.info(`Updating account token holders for (tokenAddress, signer): \n\t- ${accounts
                .map(({ signerAddress, tokenAddress }) => `(${tokenAddress}, ${signerAddress})`)
                .join(',\n\t- ')}`);
            await (0, tokenHoldes_1.insertAccountTokenHolders)(accounts);
        }
        // Saving account token holders and displaying updated holders and signers
        if (contracts.length > 0) {
            logger_1.default.info(`Updating contract token holders for (tokenAddress, contract): \n\t- ${contracts
                .map(({ evmAddress, tokenAddress }) => `(${tokenAddress}, ${evmAddress})`)
                .join(',\n\t- ')}`);
            await (0, tokenHoldes_1.insertAccountTokenHolders)(contracts);
        }
    }
}
exports.default = Erc20TransferEvent;
//# sourceMappingURL=Erc20TransferEvent.js.map