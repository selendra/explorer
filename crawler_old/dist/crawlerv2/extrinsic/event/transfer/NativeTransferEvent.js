"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const extrinsic_1 = require("../../../../queries/extrinsic");
const connector_1 = require("../../../../utils/connector");
const logger_1 = __importDefault(require("../../../../utils/logger"));
const utils_1 = require("../../../../utils/utils");
const DefaultEvent_1 = __importDefault(require("../DefaultEvent"));
class NativeTransferEvent extends DefaultEvent_1.default {
    constructor() {
        super(...arguments);
        this.to = '';
        this.from = '';
        this.toEvm = '';
        this.fromEvm = '';
        this.amount = '';
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        const [fromAddress, toAddress, amount] = this.head.event.event.data;
        const [toEvmAddress, fromEvmAddress] = await Promise.all([
            connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.evmAddresses(toAddress)),
            connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.evmAddresses(fromAddress)),
        ]);
        this.amount = amount.toString();
        this.to = toAddress.toString();
        this.from = fromAddress.toString();
        this.toEvm = toEvmAddress.toString();
        this.fromEvm = fromEvmAddress.toString();
        logger_1.default.info(`Processing native transfer from ${fromAddress} to ${toAddress} -> ${this.amount} SEL`);
        await accountsManager.use(this.to);
        await accountsManager.use(this.from);
    }
    async save(extrinsicData) {
        await super.save(extrinsicData);
        logger_1.default.info('Inserting transfer');
        await (0, extrinsic_1.insertTransfers)([{
                denom: 'SEL',
                type: 'Native',
                amount: this.amount,
                toAddress: this.to,
                fromAddress: this.from,
                toEvmAddress: this.toEvm,
                blockId: this.head.blockId,
                fromEvmAddress: this.fromEvm,
                timestamp: this.head.timestamp,
                extrinsicId: extrinsicData.id,
                tokenAddress: utils_1.SELENDRA_CONTRACT_ADDRESS,
                success: extrinsicData.status.type === 'success',
                feeAmount: ethers_1.BigNumber.from(extrinsicData.signedData.fee.partialFee).toString(),
                errorMessage: extrinsicData.status.type === 'error' ? extrinsicData.status.message : '',
            }]);
    }
}
exports.default = NativeTransferEvent;
//# sourceMappingURL=NativeTransferEvent.js.map