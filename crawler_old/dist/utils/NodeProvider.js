"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const selendra_evm_1 = require("@selendra/selendra_evm");
const api_1 = require("@polkadot/api");
const utils_1 = require("./utils");
const logger_1 = __importDefault(require("./logger"));
class NodeProvider {
    constructor(urls) {
        this.dbBlockId = -1;
        this.currentProvider = 0;
        this.providers = [];
        this.lastBlockIds = [];
        this.lastFinalizedBlockIds = [];
        this.urls = [...urls];
    }
    setDbBlockId(id) {
        this.dbBlockId = id;
    }
    lastBlockId() {
        return (0, utils_1.max)(...this.lastBlockIds);
    }
    lastFinalizedBlockId() {
        return (0, utils_1.max)(...this.lastFinalizedBlockIds);
    }
    getProvider() {
        if (this.providers.length === 0) {
            throw new Error('Initialize providers! Non was detected');
        }
        const pointer = this.currentProvider;
        this.currentProvider = (this.currentProvider + 1) % this.providers.length;
        return this.providers[pointer];
    }
    /* eslint "no-unused-vars": "off" */
    async query(fun) {
        this.currentProvider = (this.currentProvider + 1) % this.providers.length;
        while (this.lastBlockIds[this.currentProvider] < this.dbBlockId) {
            this.currentProvider = (this.currentProvider + 1) % this.providers.length;
        }
        const providerPointer = this.providers[this.currentProvider];
        return fun(providerPointer);
    }
    async initializeProviders() {
        logger_1.default.info('Connecting to nodes...');
        await this.initializeNodeProviders();
        logger_1.default.info('... connected');
        logger_1.default.info('Syncing node...');
        await this.syncNode();
        logger_1.default.info('Syncing complete');
    }
    async closeProviders() {
        logger_1.default.info('Closing providers');
        for (let index = 0; index < this.providers.length; index += 1) {
            await this.providers[index].api.disconnect();
        }
        this.providers = [];
        this.lastBlockIds = [];
        this.lastFinalizedBlockIds = [];
    }
    async restartNodeProviders() {
        await this.closeProviders();
        await this.initializeProviders();
    }
    async areNodesSyncing() {
        for (let index = 0; index < this.providers.length; index += 1) {
            const node = await this.providers[index].api.rpc.system.health();
            if (node.isSyncing.eq(true)) {
                return true;
            }
        }
        return false;
    }
    async syncNode() {
        while (await this.areNodesSyncing()) {
            await (0, utils_1.wait)(1000);
        }
    }
    async initializeNodeProviders() {
        logger_1.default.info('Inside');
        for (let index = 0; index < this.urls.length; index += 1) {
            const provider = new selendra_evm_1.Provider({
                provider: new api_1.WsProvider(this.urls[index]),
            });
            await provider.api.isReadyOrError;
            this.providers.push(provider);
            this.lastBlockIds.push(-1);
        }
        for (let index = 0; index < this.providers.length; index += 1) {
            this.providers[index].api.rpc.chain.subscribeFinalizedHeads(async (header) => {
                this.lastFinalizedBlockIds[index] = header.number.toNumber();
            });
            this.providers[index].api.rpc.chain.subscribeNewHeads(async (header) => {
                this.lastBlockIds[index] = header.number.toNumber();
            });
        }
    }
}
exports.default = NodeProvider;
//# sourceMappingURL=NodeProvider.js.map