"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connector_1 = require("../../../utils/connector");
const logger_1 = __importDefault(require("../../../utils/logger"));
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
class StakingEvent extends DefaultEvent_1.default {
    constructor() {
        super(...arguments);
        this.signer = '';
        this.amount = '0';
    }
    async process(accountsManager) {
        await super.process(accountsManager);
        this.signer = this.head.event.event.data[0].toString();
        this.amount = this.head.event.event.data[1].toString();
        // Marking controller account
        await accountsManager.use(this.signer);
        // Retrieving block hash to extract correct reward destination mapping
        const blockHash = await connector_1.nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(this.head.blockId));
        // Retrieving reward destination mapping for specific block and user
        const rewardDestination = await connector_1.nodeProvider.query((provider) => provider.api.query.staking.payee.at(blockHash, this.signer));
        // If account has speficied different reward destination we switch the staking signer to that one
        if (rewardDestination.isAccount) {
            logger_1.default.info(`Redirecting staking rewards from: ${this.signer} to: ${rewardDestination.asAccount.toString()}`);
            this.signer = rewardDestination.asAccount.toString();
            // Marking destination account
            await accountsManager.use(this.signer);
        }
    }
    async save(extrinsicData) {
        // Saving default event
        await super.save(extrinsicData);
        // Saving processed staking
        logger_1.default.info('Inserting staking event');
        await (0, connector_1.queryv2)(`INSERT INTO staking
        (event_id, signer, amount, type, timestamp)
      VALUES
        ($1, $2, $3, $4, $5)`, [this.id, this.signer, this.amount, 'Reward', this.head.timestamp]);
    }
}
exports.default = StakingEvent;
//# sourceMappingURL=StakingEvent.js.map