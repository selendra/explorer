"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const extrinsic_1 = require("../../../../queries/extrinsic");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const EvmLogEvent_1 = __importDefault(require("../EvmLogEvent"));
class DefaultErcTransferEvent extends EvmLogEvent_1.default {
    constructor() {
        super(...arguments);
        this.transfers = [];
        this.accountTokenHolders = [];
        this.contractTokenHolders = [];
    }
    addTokenHolder(address, evmAddress, balance, nftId = null) {
        if (address === '0x') {
            return;
        }
        // Creating new token holder
        const tokenHolder = {
            nftId,
            balance,
            evmAddress: address === '' ? evmAddress : '',
            timestamp: this.head.timestamp,
            info: this.contract.contract_data,
            tokenAddress: this.contract.address,
            type: address === '' ? 'Contract' : 'Account',
            signerAddress: address,
        };
        // Based on reciever type (contract/account) we extend holder accordingly
        if (tokenHolder.type === 'Account') {
            this.accountTokenHolders.push(tokenHolder);
        }
        else {
            this.contractTokenHolders.push(tokenHolder);
        }
    }
    async save(extrinsicData) {
        await super.save(extrinsicData);
        logger_1.default.info('Inserting Erc transfers');
        await (0, extrinsic_1.insertTransfers)(this.transfers.map((transfer) => ({
            ...transfer,
            success: true,
            errorMessage: '',
            extrinsicId: extrinsicData.id,
            feeAmount: ethers_1.BigNumber.from(extrinsicData.signedData.fee.partialFee).toString(),
        })));
    }
}
exports.default = DefaultErcTransferEvent;
//# sourceMappingURL=DefaultErcTransferEvent.js.map