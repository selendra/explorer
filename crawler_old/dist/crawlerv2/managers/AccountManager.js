"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../crawler/utils");
const event_1 = require("../../queries/event");
const connector_1 = require("../../utils/connector");
const logger_1 = __importDefault(require("../../utils/logger"));
const utils_2 = require("../../utils/utils");
const tokenHoldes_1 = require("../../queries/tokenHoldes");
// Account manager stores used accounts and allows to trigger account save
class AccountManager {
    constructor(blockId, timestamp) {
        this.accounts = {};
        this.blockId = blockId;
        this.blockTimestamp = timestamp;
    }
    async use(address, active = true) {
        // If account does not exist, we extract his info and store it
        if (!this.accounts[address]) {
            this.accounts[address] = await this.accountInfo(address);
        }
        this.accounts[address].active = active;
        return this.accounts[address];
    }
    async useEvm(evmAddress) {
        // Node/Empty/Root address is presented as 0x
        if (evmAddress === '0x0000000000000000000000000000000000000000') {
            return '0x';
        }
        const address = await (0, utils_1.findNativeAddress)(evmAddress);
        // Address can also be of contract and for this case node returns empty string
        // We are only processing accounts in accounts manager!
        if (address !== '') {
            await this.use(address);
            return address;
        }
        return '0x';
    }
    async save() {
        const accounts = Object.keys(this.accounts);
        const usedAccounts = accounts.map((address) => this.accounts[address]);
        if (usedAccounts.length === 0) {
            return;
        }
        // Saving used accounts
        logger_1.default.info(`Updating accounts: \n\t- ${accounts.join(', \n\t- ')}`);
        await (0, event_1.insertAccounts)(usedAccounts);
        // Converting accounts into token holders
        const tokenHolders = usedAccounts
            .map((account) => ({
            timestamp: account.timestamp,
            signerAddress: account.address,
            tokenAddress: utils_2.SELENDRA_CONTRACT_ADDRESS,
            info: { ...utils_2.SELENDRA_DEFAULT_DATA },
            balance: account.freeBalance,
            type: 'Account',
            evmAddress: '',
            nftId: null,
        }));
        // Updating account native token holder
        logger_1.default.info('Updating native token holders for used accounts');
        await (0, tokenHoldes_1.insertAccountTokenHolders)(tokenHolders);
    }
    async accountInfo(address) {
        const [evmAddress, balances, identity] = await Promise.all([
            connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.evmAddresses(address)),
            connector_1.nodeProvider.query((provider) => provider.api.derive.balances.all(address)),
            connector_1.nodeProvider.query((provider) => provider.api.derive.accounts.identity(address)),
        ]);
        // TODO clean below code
        const addr = evmAddress.toString();
        const evmAddr = addr !== ''
            ? (0, utils_2.toChecksumAddress)(addr)
            : addr;
        const evmNonce = addr !== ''
            ? await connector_1.nodeProvider.query((provider) => provider.api.query.evm.accounts(addr))
                .then((res) => res.toJSON())
                .then((res) => res?.nonce || 0)
            : 0;
        return {
            address,
            evmNonce,
            active: true,
            evmAddress: evmAddr,
            blockId: this.blockId,
            timestamp: this.blockTimestamp,
            freeBalance: balances.freeBalance.toString(),
            lockedBalance: balances.lockedBalance.toString(),
            availableBalance: balances.availableBalance.toString(),
            vestedBalance: balances.vestedBalance.toString(),
            votingBalance: balances.votingBalance.toString(),
            reservedBalance: balances.reservedBalance.toString(),
            identity: JSON.stringify(identity),
            nonce: balances.accountNonce.toString(),
        };
    }
}
exports.default = AccountManager;
//# sourceMappingURL=AccountManager.js.map