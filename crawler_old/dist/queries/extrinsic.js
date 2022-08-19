"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextFreeIds = exports.freeExtrinsicId = exports.freeEventId = exports.insertTransfers = exports.insertExtrinsic = exports.insertExtrinsics = void 0;
const connector_1 = require("../utils/connector");
const extrinsicToValue = ({ id, blockId, index, hash, args, docs, method, section, status, errorMessage, signed, signedData, timestamp, }) => `(
  ${id}, ${blockId}, ${index}, '${hash}', '${args}', '${docs.replace(/'/g, "''")}', '${method}', 
  '${section}', '${signed}', '${status}', '${errorMessage}', 
  ${signedData ? "'signed'" : "'unsigned'"}, ${signedData ? `'${JSON.stringify(signedData)}'` : 'null'}, '${timestamp}'
)`;
const insertExtrinsics = async (extrinsics) => {
    if (extrinsics.length > 0) {
        await (0, connector_1.insert)(`
INSERT INTO extrinsic
  (id, block_id, index, hash, args, docs, method, section, signer, status, error_message, type, signed_data, timestamp)
VALUES
${extrinsics.map(extrinsicToValue).join(',')}
ON CONFLICT DO NOTHING;
`);
    }
};
exports.insertExtrinsics = insertExtrinsics;
const insertExtrinsic = async (extrinsic) => (0, exports.insertExtrinsics)([extrinsic]);
exports.insertExtrinsic = insertExtrinsic;
const transferToValue = ({ type, denom, nftId, amount, blockId, success, timestamp, toAddress, feeAmount, extrinsicId, fromAddress, tokenAddress, errorMessage, toEvmAddress, fromEvmAddress, }) => [blockId, extrinsicId, denom || null, nftId || null, toAddress === 'null' ? null : toAddress, fromAddress === 'null' ? null : fromAddress, toEvmAddress, fromEvmAddress, tokenAddress, amount === '' ? '0' : amount, feeAmount === '' ? '0' : feeAmount, success, errorMessage, type, timestamp];
const insertTransfers = async (transfers) => {
    if (transfers.length === 0) {
        return;
    }
    await (0, connector_1.insertV2)(`
    INSERT INTO transfer
      (block_id, extrinsic_id, denom, nft_id, to_address, from_address, to_evm_address, from_evm_address, token_address, amount, fee_amount, success, error_message, type, timestamp)
    VALUES
      %L;
  `, transfers.map(transferToValue));
};
exports.insertTransfers = insertTransfers;
const nextFreeTableId = async (table) => {
    const result = await (0, connector_1.query)(`SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`);
    return result.length > 0 ? parseInt(result[0].id, 10) + 1 : 0;
};
const freeEventId = async () => nextFreeTableId('event');
exports.freeEventId = freeEventId;
const freeExtrinsicId = async () => nextFreeTableId('extrinsic');
exports.freeExtrinsicId = freeExtrinsicId;
const nextFreeIds = async () => Promise.all([(0, exports.freeEventId)(), (0, exports.freeExtrinsicId)()]);
exports.nextFreeIds = nextFreeIds;
//# sourceMappingURL=extrinsic.js.map