"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connector_1 = require("../../../utils/connector");
const logger_1 = __importDefault(require("../../../utils/logger"));
const utils_1 = require("../../../utils/utils");
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
class ContractCreateEvent extends DefaultEvent_1.default {
    constructor() {
        super(...arguments);
        this.skip = false;
    }
    static preprocessBytecode(bytecode) {
        const start = bytecode.indexOf('6080604052');
        const end = bytecode.indexOf('a265627a7a72315820') !== -1
            ? bytecode.indexOf('a265627a7a72315820')
            : bytecode.indexOf('a264697066735822');
        return {
            context: bytecode.slice(start, end),
            args: bytecode.slice(end),
        };
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        const address = this.head.event.event.data.length > 1
            // V9
            ? this.head.event.event.data[1]
            // V8
            : this.head.event.event.data[0];
        this.address = (0, utils_1.toChecksumAddress)(address.toString());
        if (ContractCreateEvent.extistingContracts.has(this.address)) {
            this.skip = true;
            return;
        }
        ContractCreateEvent.extistingContracts.add(this.address);
        logger_1.default.info(`New contract created: \n\t -${this.address}`);
        const contractData = (await connector_1.nodeProvider.query((provider) => provider.api.query.evm.accounts(this.address))).toJSON();
        this.maintainer = await accountsManager.useEvm(contractData.contractInfo.maintainer);
    }
    async save(extrinsicData) {
        await super.save(extrinsicData);
        if (this.skip) {
            return;
        }
        (0, utils_1.ensure)(!!this.address, 'Contract address was unclaimed. Call process function before save');
        (0, utils_1.ensure)(!!this.maintainer, 'Contract maintainer was unclaimed. Call process function before save');
        const bytecode = extrinsicData.args[0].toString();
        const { context, args } = ContractCreateEvent.preprocessBytecode(bytecode);
        const gasLimit = extrinsicData.args[2].toString();
        const storageLimit = extrinsicData.args[3].toString();
        logger_1.default.info('Inserting contract');
        await (0, connector_1.insertV2)(`
    INSERT INTO contract
      (address, extrinsic_id, signer, bytecode, bytecode_context, bytecode_arguments, gas_limit, storage_limit, timestamp)
    VALUES
      %L
    ON CONFLICT (address) DO NOTHING;`, [[this.address, extrinsicData.id, this.maintainer, bytecode, context, args, gasLimit, storageLimit, this.head.timestamp]]);
    }
}
ContractCreateEvent.extistingContracts = new Set();
exports.default = ContractCreateEvent;
//# sourceMappingURL=CreateContractEvent.js.map