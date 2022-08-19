"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = require("../../../queries/event");
const connector_1 = require("../../../utils/connector");
const logger_1 = __importDefault(require("../../../utils/logger"));
class DefaultEvent {
    constructor(head) {
        this.head = head;
    }
    static async nextId() {
        const result = await (0, connector_1.queryv2)('SELECT nextval(\'event_sequence\');');
        return parseInt(result[0].nextval, 10);
    }
    static async idExists(id) {
        const exist = await (0, connector_1.queryv2)('SELECT id FROM event WHERE id = $1', [id]);
        return exist.length > 0;
    }
    static async getId() {
        let id = await DefaultEvent.nextId();
        while (await DefaultEvent.idExists(id)) {
            id = await DefaultEvent.nextId();
        }
        return id;
    }
    async process(accountsManager) {
        this.id = await DefaultEvent.getId();
    }
    async save(extrinsicData) {
        if (!this.id) {
            throw new Error('Event id is not claimed!');
        }
        logger_1.default.info(`Inserting ${this.id} event`);
        await (0, event_1.insertEvent)({
            id: this.id,
            index: this.head.index,
            event: this.head.event,
            blockId: this.head.blockId,
            timestamp: this.head.timestamp,
            status: extrinsicData.status,
            extrinsicId: extrinsicData.id,
            extrinsicIndex: extrinsicData.index,
        });
    }
}
exports.default = DefaultEvent;
//# sourceMappingURL=DefaultEvent.js.map