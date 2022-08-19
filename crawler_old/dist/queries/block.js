"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeBlockWithId = exports.retrieveBlockHash = exports.deleteUnfinishedBlocks = exports.updateBlockFinalized = exports.updateBlocksFinalized = exports.insertBlock = exports.insertMultipleBlocks = exports.blockFinalized = exports.lastBlockInDatabase = void 0;
const connector_1 = require("../utils/connector");
const lastBlockInDatabase = async () => {
    const result = await (0, connector_1.query)('SELECT ID FROM block WHERE finalized = true ORDER By id DESC LIMIT 1');
    return result.length === 0 ? -1 : parseInt(result[0].id, 10);
};
exports.lastBlockInDatabase = lastBlockInDatabase;
const blockFinalized = async (blockId) => {
    await (0, connector_1.query)(`UPDATE block SET finalized = true WHERE id = ${blockId}`);
};
exports.blockFinalized = blockFinalized;
const blockValuesStatement = ({ id, hash, author, stateRoot, parentHash, extrinsicRoot, timestamp, }) => [id, hash, author, stateRoot, parentHash, extrinsicRoot, 'false', timestamp];
const insertMultipleBlocks = async (data) => (0, connector_1.insertV2)(`
INSERT INTO block
    (id, hash, author, state_root, parent_hash, extrinsic_root, finalized, timestamp)
  VALUES
    %L
  ON CONFLICT (id) DO UPDATE SET
    author = EXCLUDED.author,
    finalized = EXCLUDED.finalized,
    timestamp = EXCLUDED.timestamp,
    state_root = EXCLUDED.state_root,
    parent_hash = EXCLUDED.parent_hash,
    extrinsic_root = EXCLUDED.extrinsic_root,
    hash = EXCLUDED.hash;
`, data.map(blockValuesStatement));
exports.insertMultipleBlocks = insertMultipleBlocks;
const insertBlock = async (data) => (0, exports.insertMultipleBlocks)([data]);
exports.insertBlock = insertBlock;
const updateBlocksFinalized = async (fromID, toID) => (0, connector_1.query)(`UPDATE block SET finalized = true WHERE id >= ${fromID} AND id < ${toID};`);
exports.updateBlocksFinalized = updateBlocksFinalized;
const updateBlockFinalized = async (id) => (0, connector_1.query)(`UPDATE block SET finalized = true WHERE id = ${id};`);
exports.updateBlockFinalized = updateBlockFinalized;
const deleteUnfinishedBlocks = async () => (0, connector_1.query)('DELETE FROM block WHERE finalized = false;');
exports.deleteUnfinishedBlocks = deleteUnfinishedBlocks;
const retrieveBlockHash = async (id) => {
    const result = await (0, connector_1.queryv2)('SELECT hash FROM block WHERE id = $1;', [id]);
    return result.length > 0 ? result[0] : undefined;
};
exports.retrieveBlockHash = retrieveBlockHash;
const removeBlockWithId = async (id) => {
    await (0, connector_1.queryv2)('DELETE FROM block WHERE id = $1;', [id]);
};
exports.removeBlockWithId = removeBlockWithId;
//# sourceMappingURL=block.js.map