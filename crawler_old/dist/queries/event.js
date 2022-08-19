"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAccounts = exports.insertEvent = exports.insertEvents = void 0;
const connector_1 = require("../utils/connector");
const toEventValue = async ({ id, blockId, extrinsicId, index, event: { event: { method, section, data }, phase, }, timestamp, }) => `(${id}, ${blockId}, ${extrinsicId}, ${index}, '${section}', '${method}', '${data}', '${JSON.stringify(phase)}', '${timestamp}')`;
const insertEvents = async (events) => {
    if (events.length > 0) {
        await (0, connector_1.insert)(`
INSERT INTO event
  (id, block_id, extrinsic_id, index, section, method, data, phase, timestamp)
VALUES
  ${(await Promise.all(events.map(toEventValue))).join(',\n')};
`);
    }
};
exports.insertEvents = insertEvents;
const insertEvent = async (event) => (0, exports.insertEvents)([event]);
exports.insertEvent = insertEvent;
const accountToInsertValue = ({ address, evmAddress, blockId, active, freeBalance, availableBalance, lockedBalance, reservedBalance, votingBalance, vestedBalance, identity, nonce, evmNonce, timestamp, }) => `
  ('${address}', '${evmAddress}', ${blockId}, ${active}, ${freeBalance}, ${lockedBalance}, ${availableBalance}, ${reservedBalance}, ${votingBalance}, ${vestedBalance}, '${identity}', ${nonce}, ${evmNonce}, '${timestamp}')`;
const insertAccounts = async (accounts) => {
    if (accounts.length > 0) {
        await (0, connector_1.insert)(`
INSERT INTO account
  (address, evm_address, block_id, active, free_balance, locked_balance, available_balance, reserved_balance, voting_balance, vested_balance, identity, nonce, evm_nonce, timestamp)
VALUES
  ${accounts.map(accountToInsertValue).join(',')}
ON CONFLICT (address) DO UPDATE SET
  active = EXCLUDED.active,
  block_id = EXCLUDED.block_id,
  evm_address = EXCLUDED.evm_address,
  free_balance = EXCLUDED.free_balance,
  locked_balance = EXCLUDED.locked_balance,
  vested_balance = EXCLUDED.vested_balance,
  voting_balance = EXCLUDED.voting_balance,
  reserved_balance = EXCLUDED.reserved_balance,
  available_balance = EXCLUDED.available_balance,
  timestamp = EXCLUDED.timestamp,
  nonce = EXCLUDED.nonce,
  evm_nonce = EXCLUDED.evm_nonce,
  identity = EXCLUDED.identity;
`);
    }
};
exports.insertAccounts = insertAccounts;
//# sourceMappingURL=event.js.map