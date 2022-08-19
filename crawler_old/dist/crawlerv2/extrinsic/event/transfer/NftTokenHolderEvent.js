"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tokenHoldes_1 = require("../../../../queries/tokenHoldes");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const utils_1 = require("../../../../utils/utils");
const DefaultErcTransferEvent_1 = __importDefault(require("./DefaultErcTransferEvent"));
class NftTokenHolderEvent extends DefaultErcTransferEvent_1.default {
    constructor() {
        super(...arguments);
        this.name = 'ERC1155';
    }
    async save(extrinsicData) {
        await super.save(extrinsicData);
        // Saving account nft holders and displaying updated holders and signers
        const accounts = (0, utils_1.dropDuplicatesMultiKey)(this.accountTokenHolders, ['signerAddress', 'tokenAddress', 'nftId']);
        const contracts = (0, utils_1.dropDuplicatesMultiKey)(this.contractTokenHolders, ['evmAddress', 'tokenAddress', 'nftId']);
        if (accounts.length > 0) {
            logger_1.default.info(`Updating account ${this.name} holders for (tokenAddress, signer): \n\t- ${accounts
                .map(({ signerAddress, tokenAddress }) => `(${tokenAddress}, ${signerAddress})`)
                .join(',\n\t- ')}`);
            await (0, tokenHoldes_1.insertAccountNftHolders)(accounts);
        }
        // Saving account nft holders and displaying updated holders and signers
        if (contracts.length > 0) {
            logger_1.default.info(`Updating contract ${this.name} holders for (tokenAddress, contract): \n\t- ${contracts
                .map(({ evmAddress, tokenAddress }) => `(${tokenAddress}, ${evmAddress})`)
                .join(',\n\t- ')}`);
            await (0, tokenHoldes_1.insertContractNftHolders)(contracts);
        }
    }
}
exports.default = NftTokenHolderEvent;
//# sourceMappingURL=NftTokenHolderEvent.js.map