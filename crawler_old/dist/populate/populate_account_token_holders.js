"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../crawler/utils");
const tokenHoldes_1 = require("../queries/tokenHoldes");
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const utils_2 = require("../utils/utils");
const main = async () => {
    await connector_1.nodeProvider.initializeProviders();
    logger_1.default.info('Retrieving wrong token holders');
    const data = await (0, connector_1.queryv2)(`SELECT 
      th.token_address, th.signer, th.evm_address, th.nft_id, th.type, th.info,
      vc.type as contract_type, vc.name, vc.compiled_data 
    FROM token_holder as th
    JOIN contract as c ON c.address = th.token_address
    JOIN verified_contract as vc ON c.address = vc.address
    WHERE th.signer IS NOT NULL AND th.evm_address IS NOT NULL;
  `);
    logger_1.default.info('Removing duplicates');
    // Aligning primary keys
    const result = (0, utils_2.dropDuplicatesMultiKey)(data, ['token_address', 'evm_address', 'nft_id']);
    // Creating new token holders
    const nftHolders = [];
    const tokenHolders = [];
    // Resolving latest balance of signer, token and nft
    // eslint-disable-next-line
    for (const holder of result) {
        logger_1.default.info(`Processing signer ${holder.signer}, token: ${holder.token_address}, nft: ${holder.nft_id}`);
        const balance = holder.contract_type === 'ERC1155'
            ? await (0, utils_1.balanceOfErc1155)(holder.evm_address, holder.token_address, holder.nft_id, holder.compiled_data[holder.name])
            : await (0, utils_1.balanceOf)(holder.evm_address, holder.token_address, holder.compiled_data[holder.name]);
        const newHolder = {
            balance,
            evmAddress: '',
            info: holder.info,
            nftId: null,
            signerAddress: holder.signer,
            timestamp: new Date(Date.now()).toUTCString(),
            tokenAddress: holder.token_address,
            type: holder.type,
        };
        if (holder.nft_id === null) {
            tokenHolders.push(newHolder);
        }
        else {
            nftHolders.push(newHolder);
        }
    }
    logger_1.default.info('Inserting account token holders');
    await (0, tokenHoldes_1.insertAccountTokenHolders)(tokenHolders);
    logger_1.default.info('Insert account nft holders');
    await (0, tokenHoldes_1.insertAccountNftHolders)(nftHolders);
    logger_1.default.info('Deleting wrong token holders');
    await (0, connector_1.queryv2)('DELETE FROM token_holder WHERE signer IS NOT NULL AND evm_address IS NOT NULL;');
    logger_1.default.info('Account token & nft holders repaired');
};
main()
    .then(() => process.exit())
    .then((e) => {
    logger_1.default.error(e);
    process.exit(404);
});
//# sourceMappingURL=populate_account_token_holders.js.map