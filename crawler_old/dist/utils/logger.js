"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const transport = pino_1.default.transport({
    targets: [
        {
            level: 'info',
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'yyyy-dd-mm, h:MM:ss TT',
            },
        },
        {
            level: 'trace',
            target: 'pino/file',
            options: { destination: './selendra-explorer.log' },
        },
    ],
});
exports.default = (0, pino_1.default)(transport);
//# sourceMappingURL=logger.js.map