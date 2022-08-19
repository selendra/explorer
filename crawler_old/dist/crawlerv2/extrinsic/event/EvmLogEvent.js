"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const logger_1 = __importDefault(require("../../../utils/logger"));
const utils_1 = require("../../../utils/utils");
const UnverifiedEvmLog_1 = __importDefault(require("./UnverifiedEvmLog"));
class EvmLogEvent extends UnverifiedEvmLog_1.default {
    constructor(head, contract) {
        super(head);
        this.contract = contract;
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        const eventData = this.head.event.event.data.toJSON();
        const { topics, data } = eventData[0];
        let { address } = eventData[0];
        address = (0, utils_1.toChecksumAddress)(address);
        this.data = {
            raw: { address, topics, data }, parsed: null,
        };
        const { compiled_data, name } = this.contract;
        try {
            const iface = new ethers_1.utils.Interface(compiled_data[name]);
            this.data.parsed = iface.parseLog({ topics, data });
            this.type = 'Verified';
        }
        catch (e) {
            logger_1.default.warn('Contract event was not compiled...');
        }
    }
}
exports.default = EvmLogEvent;
//# sourceMappingURL=EvmLogEvent.js.map