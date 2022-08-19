"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseWithTimeout = exports.toChecksumAddress = exports.removeUndefinedItem = exports.resolvePromisesAsChunks = exports.dropDuplicatesMultiKey = exports.dropDuplicates = exports.range = exports.max = exports.min = exports.ensure = exports.wait = exports.SELENDRA_DEFAULT_DATA = exports.SELENDRA_CONTRACT_ADDRESS = void 0;
const ethers_1 = require("ethers");
const config_1 = __importDefault(require("../config"));
exports.SELENDRA_CONTRACT_ADDRESS = '0x0000000000000000000100000000000000000000';
exports.SELENDRA_DEFAULT_DATA = {
    decimals: 18,
    symbol: 'SEL',
    name: 'Selendra',
};
/* eslint no-promise-executor-return: "off" */
const wait = async (ms) => new Promise((res) => setTimeout(res, ms));
exports.wait = wait;
const ensure = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
exports.ensure = ensure;
const min = (...args) => {
    if (args.length === 0) {
        throw new Error('Given array is empty!');
    }
    return args.reduce((prev, current) => (prev < current ? prev : current), args[0]);
};
exports.min = min;
const max = (...args) => {
    if (args.length === 0) {
        throw new Error('Given array is empty!');
    }
    return args.reduce((prev, current) => (prev > current ? prev : current), args[0]);
};
exports.max = max;
const range = (from, to) => Array(to - from)
    .fill(0)
    .map((_, index) => from + index);
exports.range = range;
const dropDuplicates = (objects, key) => {
    const existingKeys = new Set();
    const filtered = [];
    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const obj = objects[index];
        if (!existingKeys.has(obj[key])) {
            filtered.push(obj);
            existingKeys.add(obj[key]);
        }
    }
    return filtered;
};
exports.dropDuplicates = dropDuplicates;
const dropDuplicatesMultiKey = (objects, keys) => {
    const existingKeys = new Set();
    const filtered = [];
    for (let index = objects.length - 1; index >= 0; index -= 1) {
        const obj = objects[index];
        const ids = keys.map((key) => obj[key]).join(', ');
        if (!existingKeys.has(ids)) {
            filtered.push(obj);
            existingKeys.add(ids);
        }
    }
    return filtered;
};
exports.dropDuplicatesMultiKey = dropDuplicatesMultiKey;
const resolvePromisesAsChunks = async (requests) => {
    const chunks = [];
    let currentChunks = [];
    for (let index = 0; index < requests.length; index += 1) {
        currentChunks.push(requests[index]);
        if (currentChunks.length === config_1.default.chunkSize) {
            const resolvedChunk = await Promise.all(currentChunks);
            chunks.push(...resolvedChunk);
            currentChunks = [];
        }
    }
    const resolvedChunk = await Promise.all(currentChunks);
    chunks.push(...resolvedChunk);
    return chunks;
};
exports.resolvePromisesAsChunks = resolvePromisesAsChunks;
const removeUndefinedItem = (item) => item !== undefined;
exports.removeUndefinedItem = removeUndefinedItem;
const toChecksumAddress = (address) => ethers_1.utils.getAddress(address.trim().toLowerCase());
exports.toChecksumAddress = toChecksumAddress;
const promiseWithTimeout = (promise, ms, timeoutError = new Error('Promise timed out')) => {
    // create a promise that rejects in milliseconds
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(timeoutError);
        }, ms);
    });
    // returns a race between timeout and the passed promise
    return Promise.race([promise, timeout]);
};
exports.promiseWithTimeout = promiseWithTimeout;
//# sourceMappingURL=utils.js.map