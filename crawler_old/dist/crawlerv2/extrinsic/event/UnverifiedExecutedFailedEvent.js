"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UnverifiedEvmLog_1 = __importDefault(require("./UnverifiedEvmLog"));
class UnverifiedExecutedFailedEvent extends UnverifiedEvmLog_1.default {
    constructor() {
        super(...arguments);
        this.method = 'ExecutedFailed';
    }
}
exports.default = UnverifiedExecutedFailedEvent;
//# sourceMappingURL=UnverifiedExecutedFailedEvent.js.map