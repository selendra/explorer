"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
class SignerAddressCapture extends DefaultEvent_1.default {
    async process(accountsManager) {
        await super.process(accountsManager);
        const address = this.head.event.event.data[0].toString();
        await accountsManager.use(address);
    }
}
exports.default = SignerAddressCapture;
//# sourceMappingURL=SignerAddressCapture.js.map