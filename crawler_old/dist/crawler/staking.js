"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertStaking = exports.processStakingEvent = exports.stakingToAccount = void 0;
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const stakingToInsert = (staking) => [
    staking.eventId,
    staking.signer,
    staking.amount,
    staking.type,
    staking.timestamp,
];
const stakingToAccount = ({ signer, blockId, timestamp }) => ({
    blockId,
    timestamp,
    active: true,
    address: signer,
});
exports.stakingToAccount = stakingToAccount;
const processStakingEvent = async ({ id, data, timestamp, blockId, }) => {
    let signer = data[0];
    const amount = data[1];
    // Retrieving block hash to extract correct reward destination mapping
    const blockHash = await connector_1.nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(blockId));
    // Retrieving reward destination mapping for specific block and user
    const rewardDestination = await connector_1.nodeProvider.query((provider) => provider.api.query.staking.payee.at(blockHash, signer));
    // If account has speficied different reward destination we switch the staking signer to that one
    if (rewardDestination.isAccount) {
        logger_1.default.info(`Redirecting staking rewards from: ${signer} to: ${rewardDestination.asAccount.toString()}`);
        signer = rewardDestination.asAccount.toString();
    }
    return {
        amount,
        signer,
        blockId,
        timestamp,
        eventId: id,
        type: 'Reward',
    };
};
exports.processStakingEvent = processStakingEvent;
const insertStaking = async (stakingRewards) => (0, connector_1.insertV2)(`INSERT INTO staking
    (event_id, signer, amount, type, timestamp)
  VALUES
    %L;`, stakingRewards.map(stakingToInsert));
exports.insertStaking = insertStaking;
//# sourceMappingURL=staking.js.map