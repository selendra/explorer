"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
class ClaimEvmAccountEvent extends DefaultEvent_1.default {
    async process(accountsManager) {
        await super.process(accountsManager);
        const [signer] = this.head.event.event.data;
        await accountsManager.use(signer.toString());
    }
}
exports.default = ClaimEvmAccountEvent;
//# sourceMappingURL=ClaimEvmAccountEvent.js.map