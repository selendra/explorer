"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const event_1 = require("../crawler/event");
const staking_1 = require("../crawler/staking");
const event_2 = require("../queries/event");
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const utils_1 = require("../utils/utils");
const main = async () => {
    await connector_1.nodeProvider.initializeProviders();
    logger_1.default.info('Removing staking data');
    await (0, connector_1.queryv2)('DELETE FROM staking WHERE id > 0;');
    logger_1.default.info('Loading staking events');
    /* eslint-disable camelcase */
    const stakingEvents = await (0, connector_1.queryv2)('SELECT * FROM event WHERE method = \'Reward\' OR method = \'Rewarded\';')
        .then((res) => res.map(({ id, block_id, data: [address, amount], timestamp, }) => ({
        id,
        blockId: block_id,
        data: [address, ethers_1.BigNumber.from(amount).toString()],
        timestamp: new Date(timestamp).toISOString(),
    })));
    const stakingEventsLength = stakingEvents.length;
    logger_1.default.info(`There are ${stakingEventsLength} staking events`);
    logger_1.default.info('Processing staking events and extracting reward destination mapping');
    const staking = [];
    /* eslint-disable no-plusplus */
    for (let index = 0; index < stakingEventsLength; index++) {
        if (index % 100 === 0) {
            /* eslint-disable no-mixed-operators */
            logger_1.default.info(`Current processing index: ${index}, current percentage: ${(index / stakingEventsLength * 100).toFixed(2)} %`);
        }
        staking.push(await (0, staking_1.processStakingEvent)(stakingEvents[index]));
    }
    logger_1.default.info('Updating account balances');
    const accountHeaders = (0, utils_1.dropDuplicates)(staking.map(staking_1.stakingToAccount), 'address');
    logger_1.default.info('Loading account balances');
    const accounts = await (0, utils_1.resolvePromisesAsChunks)(accountHeaders.map(event_1.accountHeadToBody));
    logger_1.default.info('Inserting accounts');
    await (0, event_2.insertAccounts)(accounts);
    logger_1.default.info('Inserting staking');
    await (0, staking_1.insertStaking)(staking);
    logger_1.default.info('Complete!');
};
main()
    .then(() => process.exit())
    .catch((err) => logger_1.default.error(err));
//# sourceMappingURL=populate_staking.js.map