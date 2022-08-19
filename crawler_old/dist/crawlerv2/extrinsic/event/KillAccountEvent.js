"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
class KillAccountEvent extends DefaultEvent_1.default {
    async process(accountsManager) {
        // Process default event
        await super.process(accountsManager);
        const address = this.head.event.event.data[0].toString();
        // Kill account
        await accountsManager.use(address, false);
    }
}
exports.default = KillAccountEvent;
//# sourceMappingURL=KillAccountEvent.js.map