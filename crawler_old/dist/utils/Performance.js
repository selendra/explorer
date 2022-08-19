"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./logger"));
const Queue_1 = __importDefault(require("./Queue"));
class Performance extends Queue_1.default {
    constructor() {
        super(...arguments);
        this.duration = 0;
    }
    push(value) {
        this.values.push(value);
        this.duration += value;
        if (this.maxLength && this.values.length > this.maxLength) {
            this.duration -= this.pop();
        }
    }
    log() {
        if (!this.maxLength) {
            throw new Error('Max length is not defined');
        }
        logger_1.default.info(`Crawler speed: ${1000 / ((this.duration / this.values.length))} bps`);
    }
}
exports.default = Performance;
//# sourceMappingURL=Performance.js.map