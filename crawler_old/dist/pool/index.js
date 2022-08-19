"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../config"));
const SelendraswapPair_1 = __importDefault(require("../assets/SelendraswapPair"));
const SelendraswapFactoryAbi_1 = __importDefault(require("../assets/SelendraswapFactoryAbi"));
const erc20Abi_1 = __importDefault(require("../assets/erc20Abi"));
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const processFactoryEvent = async (evmEventId, rawData) => {
    const contractInterface = new ethers_1.utils.Interface(SelendraswapFactoryAbi_1.default);
    const data = contractInterface.parseLog(rawData);
    // We are only interested PairCreate events
    if (data.name !== 'PairCreated') {
        return;
    }
    logger_1.default.info(`Selendraswap Factory PairCreate event detected on evm even id: ${evmEventId}`);
    const [tokenAddress1, tokenAddress2, poolAddress] = data.args;
    // TODO extend pool with additional token names and symbols or remove decimal_1 and decimal_2
    const pool = new ethers_1.Contract(poolAddress, SelendraswapPair_1.default, connector_1.nodeProvider.getProvider());
    const token1 = new ethers_1.Contract(tokenAddress1, erc20Abi_1.default, connector_1.nodeProvider.getProvider());
    const token2 = new ethers_1.Contract(tokenAddress2, erc20Abi_1.default, connector_1.nodeProvider.getProvider());
    const poolDecimal = await pool.decimals();
    const tokenDecimal1 = await token1.decimals();
    const tokenDecimal2 = await token2.decimals();
    await (0, connector_1.queryv2)(`INSERT INTO pool 
      (evm_event_id, address, token_1, token_2, pool_decimal, decimal_1, decimal_2)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7);`, [evmEventId, poolAddress, tokenAddress1, tokenAddress2, poolDecimal.toString(), tokenDecimal1.toString(), tokenDecimal2.toString()]);
};
const poolEventInsertSequence = ['to_address', 'sender_address', 'amount_1', 'amount_2', 'amount_in_1', 'amount_in_2', 'reserved_1', 'reserved_2', 'supply', 'total_supply'];
const defaultPairProcess = async ({ poolId, eventId, timestamp }, type, data) => {
    logger_1.default.info(`Processing ${type} event on evm event id: ${eventId}`);
    const vals = poolEventInsertSequence.map((key) => data[key] || null);
    const keys = poolEventInsertSequence.join(', ');
    const indexes = poolEventInsertSequence
        .map((_, index) => `$${index + 5}`)
        .join(', ');
    await (0, connector_1.queryv2)(`INSERT INTO pool_event
      (pool_id, evm_event_id, timestamp, type, ${keys})
    VALUES
      ($1, $2, $3, $4, ${indexes});
    `, [poolId, eventId, timestamp, type, ...vals]);
};
// From transfer function we detect the amount of liquidity added/removed from pool
// With each Transfer event we also accumulate total supply of each pool
const processTransfer = async (event) => {
    const [addr1, addr2, amount] = event.data.args;
    if (addr1 !== ZERO_ADDRESS && addr2 !== ZERO_ADDRESS) {
        return;
    }
    if (addr1 === ZERO_ADDRESS && addr2 === ZERO_ADDRESS) {
        return;
    }
    const prevSupply = await (0, connector_1.queryv2)(`SELECT total_supply
    FROM pool_event
    WHERE type = 'Transfer' AND pool_id = $1
    ORDER BY timestamp desc
    LIMIT 1;
    `, [event.poolId]);
    const supply = prevSupply && prevSupply.length > 0 ? prevSupply[0].total_supply : 0;
    const isMint = addr1 === ZERO_ADDRESS;
    const prev = ethers_1.BigNumber.from(supply.toString());
    const totalSupply = isMint ? prev.add(amount) : prev.sub(amount);
    await defaultPairProcess(event, 'Transfer', {
        supply: `${!isMint ? '-' : ''}${amount.toString()}`,
        total_supply: totalSupply.toString(),
    });
};
const processSync = async (event) => defaultPairProcess(event, 'Sync', {
    reserved_1: event.data.args[0].toString(),
    reserved_2: event.data.args[1].toString(),
});
const processMint = async (event) => defaultPairProcess(event, 'Mint', {
    sender_address: event.data.args[0],
    amount_1: event.data.args[1].toString(),
    amount_2: event.data.args[2].toString(),
});
const processBurn = async (event) => defaultPairProcess(event, 'Burn', {
    sender_address: event.data.args[0],
    amount_1: event.data.args[1].toString(),
    amount_2: event.data.args[2].toString(),
    to_address: event.data.args[3],
});
const processSwap = async (event) => defaultPairProcess(event, 'Swap', {
    sender_address: event.data.args[0],
    amount_in_1: event.data.args[1].toString(),
    amount_in_2: event.data.args[2].toString(),
    amount_1: event.data.args[3].toString(),
    amount_2: event.data.args[4].toString(),
    to_address: event.data.args[5],
});
const processPairEvent = async (pairEvent) => {
    logger_1.default.info('Selendraswap Pair event detected!');
    const contractInterface = new ethers_1.utils.Interface(SelendraswapPair_1.default);
    const data = contractInterface.parseLog(pairEvent.rawData);
    switch (data.name) {
        case 'Mint':
            await processMint({ ...pairEvent, data });
            break;
        case 'Burn':
            await processBurn({ ...pairEvent, data });
            break;
        case 'Swap':
            await processSwap({ ...pairEvent, data });
            break;
        case 'Sync':
            await processSync({ ...pairEvent, data });
            break;
        case 'Transfer':
            await processTransfer({ ...pairEvent, data });
            break;
        default: break;
    }
};
const findEvmEvent = async (eventId) => {
    const evmEvents = await (0, connector_1.queryv2)(`SELECT 
      ee.id, ee.data_raw as rawdata, ee.contract_address as contractaddress, b.timestamp 
    FROM evm_event as ee
    JOIN block as b
      ON ee.block_id = b.id
    WHERE ee.id = $1;`, [eventId]);
    if (evmEvents.length === 0) {
        throw new Error('Evm event does not exist');
    }
    return evmEvents[0];
};
const findPoolID = async (address) => {
    const ids = await (0, connector_1.queryv2)('SELECT id FROM pool WHERE address = $1', [address]);
    return ids.length > 0 ? ids[0].id : undefined;
};
exports.default = async (eventId) => {
    // logger.info(`Processing event: ${eventId}`);
    const event = await findEvmEvent(eventId);
    // Check if event is Selendraswap factory create pool event. If so add new pool in DB
    if (event.contractaddress.toLowerCase() === config_1.default.selendraswapFactoryAddress.toLowerCase()) {
        await processFactoryEvent(eventId, event.rawdata);
        return;
    }
    // Check if current event address is in pools table
    // If so process pool event accordingly
    const poolId = await findPoolID(event.contractaddress);
    if (poolId) {
        await processPairEvent({
            eventId,
            poolId,
            rawData: event.rawdata,
            timestamp: event.timestamp,
            address: event.contractaddress,
        });
    }
};
//# sourceMappingURL=index.js.map