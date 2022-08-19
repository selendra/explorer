"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEvmEvents = exports.insertEvmLog = exports.insertEvmEvents = exports.getERC20Tokens = exports.insertContract = exports.insertContracts = exports.getContractDB = void 0;
const ethers_1 = require("ethers/lib/ethers");
const pg_format_1 = __importDefault(require("pg-format"));
const connector_1 = require("../utils/connector");
const utils_1 = require("../utils/utils");
const contractToValues = ({ address, extrinsicId, bytecode, bytecodeContext, bytecodeArguments, gasLimit, storageLimit, signer, timestamp, }) => {
    const contractAddress = (0, utils_1.toChecksumAddress)(address);
    return contractAddress ? `('${contractAddress}', ${extrinsicId}, '${signer}', '${bytecode}', '${bytecodeContext}', '${bytecodeArguments}', ${gasLimit}, ${storageLimit}, '${timestamp}')` : '';
};
const getContractDB = async (address) => {
    const contractAddress = (0, utils_1.toChecksumAddress)(address);
    return contractAddress
        ? (0, connector_1.query)(`SELECT address, contract_data, compiled_data, name, type FROM verified_contract WHERE address='${contractAddress}';`)
        : [];
};
exports.getContractDB = getContractDB;
const insertContracts = async (contracts) => {
    if (contracts.length === 0) {
        return;
    }
    await (0, connector_1.insert)(`
    INSERT INTO contract
      (address, extrinsic_id, signer, bytecode, bytecode_context, bytecode_arguments, gas_limit, storage_limit, timestamp)
    VALUES
      ${contracts.map(contractToValues).filter((v) => !!v).join(',\n')}
    ON CONFLICT (address) DO UPDATE
      SET extrinsic_id = EXCLUDED.extrinsic_id,
        bytecode = EXCLUDED.bytecode,
        gas_limit = EXCLUDED.gas_limit,
        timestamp = EXCLUDED.timestamp,
        storage_limit = EXCLUDED.storage_limit,
        bytecode_context = EXCLUDED.bytecode_context,
        bytecode_arguments = EXCLUDED.bytecode_arguments;
  `);
};
exports.insertContracts = insertContracts;
const insertContract = async (contract) => (0, exports.insertContracts)([contract]);
exports.insertContract = insertContract;
const getERC20Tokens = async () => (0, connector_1.query)('SELECT address, contract_data, name FROM verified_contract WHERE type=\'ERC20\';');
exports.getERC20Tokens = getERC20Tokens;
const parseEvmLogData = async (method, genericData) => {
    const eventData = genericData.toJSON();
    if (method === 'Log') {
        const { topics, data } = eventData[0];
        let { address } = eventData[0];
        address = (0, utils_1.toChecksumAddress)(address);
        if (!address) {
            return undefined;
        }
        const evmData = {
            raw: { address, topics, data }, parsed: {}, status: 'Success', type: 'Unverified',
        };
        const contract = await (0, exports.getContractDB)(address);
        if (contract.length === 0) {
            return evmData;
        }
        const iface = new ethers_1.utils.Interface(contract[0].compiled_data[contract[0].name]);
        try {
            evmData.parsed = iface.parseLog({ topics, data });
            evmData.type = 'Verified';
        }
        catch {
            //
        }
        return evmData;
    }
    if (method === 'ExecutedFailed') {
        let decodedMessage;
        try {
            decodedMessage = eventData[2] === '0x' ? '' : ethers_1.utils.toUtf8String(`0x${eventData[2].substr(138)}`.replace(/0+$/, ''));
        }
        catch {
            decodedMessage = '';
        }
        const decodedError = { address: eventData[0], message: decodedMessage };
        return {
            parsed: decodedError, raw: { address: decodedError.address, data: '', topics: [] }, status: 'Error', type: 'Verified',
        };
    }
    return undefined;
};
const toEventData = (eventBody) => ({
    id: eventBody.id,
    timestamp: eventBody.timestamp,
    data: eventBody.event.event.data,
    section: eventBody.event.event.section,
    method: eventBody.event.event.method,
    blockId: eventBody.blockId,
    eventIndex: eventBody.index,
    extrinsicIndex: eventBody.extrinsicIndex,
});
const evmEventDataToInsertValue = async ({ id, data, method, blockId, eventIndex, extrinsicIndex, }) => {
    const parsedEvmData = await parseEvmLogData(method, data);
    if (!parsedEvmData) {
        return null;
    }
    const topics = parsedEvmData.raw.topics || [];
    const parsedEvmString = parsedEvmData.parsed ? JSON.stringify(parsedEvmData.parsed) : undefined;
    return `(${id}, '${parsedEvmData.raw.address}', '${JSON.stringify(parsedEvmData.raw)}', '${parsedEvmString}', '${method}', '${topics[0]}', '${topics[1]}', '${topics[2]}', '${topics[3]}', ${blockId}, ${extrinsicIndex}, ${eventIndex}, '${parsedEvmData.status}', '${parsedEvmData.type}')`;
};
// TODO deprecating
const insertEvmEvents = async (evmEvents) => {
    if (evmEvents.length < 1) {
        return;
    }
    const insertValuePromises = evmEvents
        .filter(({ event: { event: { section, method } } }) => section === 'evm' && (method === 'ExecutedFailed' || method === 'Log'))
        .map(toEventData)
        .map(evmEventDataToInsertValue);
    const evmEventInputValues = (await Promise.all(insertValuePromises)).filter((v) => !!v);
    if (evmEventInputValues.length) {
        await (0, connector_1.insert)(`
      INSERT INTO evm_event
      (event_id, contract_address, data_raw, data_parsed, method, topic_0, topic_1, topic_2, topic_3, block_id, extrinsic_index, event_index, status, type)
      VALUES
      ${evmEventInputValues.join(',\n')};
    `);
    }
};
exports.insertEvmEvents = insertEvmEvents;
const insertEvmLog = async (logs) => {
    if (logs.length > 0) {
        await (0, connector_1.queryv2)((0, pg_format_1.default)(`
        INSERT INTO evm_event
          (event_id, contract_address, data_raw, data_parsed, method, topic_0, topic_1, topic_2, topic_3, block_id, extrinsic_index, event_index, status, type)
        VALUES 
          %L;
      `, logs.map((log) => [
            log.eventId,
            log.raw.address,
            JSON.stringify(log.raw),
            JSON.stringify(log.parsed) || null,
            log.method,
            log.raw.topics[0] || null,
            log.raw.topics[1] || null,
            log.raw.topics[2] || null,
            log.raw.topics[3] || null,
            log.blockId,
            log.extrinsicIndex,
            log.eventIndex,
            log.status,
            log.type,
        ])));
    }
};
exports.insertEvmLog = insertEvmLog;
const updateEvmEvents = async (evmEvents) => {
    if (!evmEvents.length) {
        return;
    }
    await (0, connector_1.queryv2)((0, pg_format_1.default)(`INSERT INTO evm_event
        (id, event_id, block_id, event_index, extrinsic_index, contract_address, data_raw, method, status, type, data_parsed)
      VALUES
        %L
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        data_parsed = EXCLUDED.data_parsed
        `, evmEvents.map(({ id, status, type, method, blockid, parseddata, extrinsicindex, eventindex, eventid, contractaddress, rawdata, }) => [id, eventid, blockid, eventindex, extrinsicindex, contractaddress, rawdata, method, status, type, parseddata])));
};
exports.updateEvmEvents = updateEvmEvents;
//# sourceMappingURL=evmEvent.js.map