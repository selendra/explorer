"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const evmEvent_1 = require("../../../queries/evmEvent");
const logger_1 = __importDefault(require("../../../utils/logger"));
const utils_1 = require("../../../utils/utils");
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
class UnverifiedEvmLog extends DefaultEvent_1.default {
    constructor() {
        super(...arguments);
        this.method = 'Log';
        this.type = 'Unverified';
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
    }
    async save(extrinsicData) {
        await super.save(extrinsicData);
        if (!this.id) {
            throw new Error('Id is not claimed');
        }
        if (!this.data) {
            throw new Error('Evm log data is not defined, call process function before saving!');
        }
        logger_1.default.info('Inserting evm log');
        await (0, evmEvent_1.insertEvmLog)([{
                ...this.data,
                blockId: this.head.blockId,
                eventId: this.id,
                eventIndex: this.head.index,
                extrinsicIndex: extrinsicData.index,
                status: extrinsicData.status.type === 'success' ? 'Success' : 'Error',
                type: this.type,
                method: this.method,
            }]);
    }
}
exports.default = UnverifiedEvmLog;
//# sourceMappingURL=UnverifiedEvmLog.js.map