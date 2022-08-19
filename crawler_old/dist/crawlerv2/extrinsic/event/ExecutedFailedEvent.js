"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EvmLogEvent_1 = __importDefault(require("./EvmLogEvent"));
class ExecutedFailedEvent extends EvmLogEvent_1.default {
    constructor() {
        super(...arguments);
        this.method = 'ExecutedFailed';
    }
}
exports.default = ExecutedFailedEvent;
//# sourceMappingURL=ExecutedFailedEvent.js.map