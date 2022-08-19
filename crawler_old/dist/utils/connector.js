"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryv2 = exports.query = exports.insertV2 = exports.insert = exports.liveGraphqlServer = exports.nodeProvider = void 0;
const pg_1 = require("pg");
const pg_format_1 = __importDefault(require("pg-format"));
const core_1 = require("@apollo/client/core");
const config_1 = __importDefault(require("../config"));
const NodeProvider_1 = __importDefault(require("./NodeProvider"));
require("cross-fetch/polyfill");
const dbProvider = new pg_1.Pool({ ...config_1.default.postgresConfig });
exports.nodeProvider = new NodeProvider_1.default(config_1.default.nodeUrls);
exports.liveGraphqlServer = new core_1.ApolloClient({
    uri: config_1.default.liveGraphqlUrl,
    cache: new core_1.InMemoryCache(),
});
const insert = async (statement) => {
    await dbProvider.query(statement);
};
exports.insert = insert;
const insertV2 = async (statement, args) => {
    if (args.length === 0) {
        return;
    }
    await dbProvider.query((0, pg_format_1.default)(statement, args));
};
exports.insertV2 = insertV2;
const query = async (statement) => {
    const client = await dbProvider.connect();
    const result = await client.query(statement);
    client.release();
    return result.rows;
};
exports.query = query;
const queryv2 = async (statement, args = []) => {
    const client = await dbProvider.connect();
    const result = await client.query(statement, args);
    client.release();
    return result.rows;
};
exports.queryv2 = queryv2;
//# sourceMappingURL=connector.js.map