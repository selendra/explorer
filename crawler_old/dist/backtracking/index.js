"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const evmEvent_1 = require("../queries/evmEvent");
const connector_1 = require("../utils/connector");
const transfer_1 = require("../crawler/transfer");
const tokenHolder_1 = require("../crawler/tokenHolder");
const extrinsic_1 = require("../queries/extrinsic");
const tokenHoldes_1 = __importDefault(require("../queries/tokenHoldes"));
const logger_1 = __importDefault(require("../utils/logger"));
exports.default = async (contractAddress) => {
    logger_1.default.info(`Retrieving Contracts: ${contractAddress} unverified evm events`);
    const evmEvents = await (0, connector_1.queryv2)(`SELECT
      ee.id, ee.event_id as eventId, ee.block_id as blockId, ev.extrinsic_id as extrinsicId, ee.event_index as eventIndex, 
      ee.extrinsic_index as extrinsicIndex, ee.contract_address as contractAddress, ee.data_raw as rawData, ee.method,
      ee.type, ee.status, ex.timestamp as timestamp, ex.signed_data as signedData
    FROM evm_event as ee
    JOIN event as ev
      ON ev.id = ee.event_id
    JOIN extrinsic as ex
      ON ev.extrinsic_id = ex.id
    WHERE ee.contract_address = $1 AND ee.type = 'Unverified';`, [contractAddress]);
    logger_1.default.info(`There were ${evmEvents.length} unverified evm events`);
    const contract = await (0, evmEvent_1.getContractDB)(contractAddress);
    if (contract.length <= 0) {
        throw new Error(`Contract address: ${contractAddress} was not found in verified contract...`);
    }
    const { compiled_data: compiledData, name, address, type, contract_data: contractData, } = contract[0];
    const contractInterface = new ethers_1.utils.Interface(compiledData[name]);
    const processedLogs = evmEvents
        .filter(({ method }) => method === 'Log')
        .map((evmEvent) => ({
        ...evmEvent,
        parseddata: contractInterface.parseLog(evmEvent.rawdata),
        type: 'Verified',
    }));
    const evmLogs = processedLogs
        .map(({ timestamp, blockid, rawdata, extrinsicid, signeddata, parseddata, }) => ({
        name,
        type,
        blockId: blockid,
        address,
        timestamp,
        signedData: signeddata,
        extrinsicId: extrinsicid,
        contractData,
        abis: compiledData,
        data: rawdata.data,
        topics: rawdata.topics,
        decodedEvent: parseddata,
        fee: signeddata,
    }));
    logger_1.default.info('Processing transfer events');
    const transfers = await (0, transfer_1.processTokenTransfers)(evmLogs);
    logger_1.default.info('Processing token-holder events');
    const tokenHolders = await (0, tokenHolder_1.processEvmTokenHolders)(evmLogs);
    logger_1.default.info('Inserting Transfers');
    await (0, extrinsic_1.insertTransfers)(transfers);
    logger_1.default.info('Inserting Token holders');
    await (0, tokenHoldes_1.default)(tokenHolders);
    logger_1.default.info('Updating evm events with parsed data');
    await (0, evmEvent_1.updateEvmEvents)(processedLogs);
};
//# sourceMappingURL=index.js.map