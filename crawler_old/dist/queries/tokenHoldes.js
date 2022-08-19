"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertContractNftHolders = exports.insertAccountNftHolders = exports.insertContractTokenHolders = exports.insertAccountTokenHolders = void 0;
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const utils_1 = require("../utils/utils");
const TOKEN_HOLDER_INSERT_STATEMENT = `
INSERT INTO token_holder
  (signer, evm_address, type, token_address, nft_id, balance, info, timestamp)
VALUES
  %L`;
const DO_UPDATE = ` balance = EXCLUDED.balance,
  timestamp = EXCLUDED.timestamp,
  info = EXCLUDED.info;`;
const toTokenHolder = ({ signerAddress, balance, tokenAddress, info, evmAddress, type, timestamp, nftId, }) => [signerAddress === '' ? null : signerAddress, evmAddress === '' ? null : evmAddress, type, tokenAddress, nftId, balance, JSON.stringify(info !== null ? info : {}), timestamp];
const insertAccountTokenHolders = async (tokenHolders) => (0, connector_1.insertV2)(`${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (signer, token_address) WHERE evm_address IS NULL AND nft_id IS NULL DO UPDATE SET
    ${DO_UPDATE}
  `, tokenHolders.map(toTokenHolder));
exports.insertAccountTokenHolders = insertAccountTokenHolders;
const insertContractTokenHolders = async (tokenHolders) => (0, connector_1.insertV2)(`${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (evm_address, token_address) WHERE signer IS NULL AND nft_id IS NULL DO UPDATE SET
    ${DO_UPDATE}
  `, tokenHolders.map(toTokenHolder));
exports.insertContractTokenHolders = insertContractTokenHolders;
const insertAccountNftHolders = async (tokenHolders) => (0, connector_1.insertV2)(`${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (signer, token_address, nft_id) WHERE evm_address IS NULL AND nft_id IS NOT NULL DO UPDATE SET
    ${DO_UPDATE}
  `, tokenHolders.map(toTokenHolder));
exports.insertAccountNftHolders = insertAccountNftHolders;
const insertContractNftHolders = async (tokenHolders) => (0, connector_1.insertV2)(`${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (evm_address, token_address, nft_id) WHERE signer IS NULL AND nft_id IS NOT NULL DO UPDATE SET
    ${DO_UPDATE}
  `, tokenHolders.map(toTokenHolder));
exports.insertContractNftHolders = insertContractNftHolders;
exports.default = async (tokenHolders) => {
    logger_1.default.info('Inserting account nft holders');
    await (0, exports.insertAccountNftHolders)((0, utils_1.dropDuplicatesMultiKey)(tokenHolders.filter(({ type, nftId }) => type === 'Account' && nftId !== null), ['signerAddress', 'tokenAddress', 'nftId']));
    logger_1.default.info('Inserting contract nft holders');
    await (0, exports.insertContractNftHolders)((0, utils_1.dropDuplicatesMultiKey)(tokenHolders.filter(({ type, nftId }) => type === 'Contract' && nftId !== null), ['evmAddress', 'tokenAddress', 'nftId']));
    logger_1.default.info('Inserting account token holders');
    await (0, exports.insertAccountTokenHolders)((0, utils_1.dropDuplicatesMultiKey)(tokenHolders.filter(({ type, nftId }) => type === 'Account' && nftId === null), ['signerAddress', 'tokenAddress']));
    logger_1.default.info('Inserting contract token holders');
    await (0, exports.insertContractTokenHolders)((0, utils_1.dropDuplicatesMultiKey)(tokenHolders.filter(({ type, nftId }) => type === 'Contract' && nftId === null), ['evmAddress', 'tokenAddress']));
};
//# sourceMappingURL=tokenHoldes.js.map