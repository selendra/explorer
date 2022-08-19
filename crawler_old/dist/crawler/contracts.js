"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connector_1 = require("../utils/connector");
const utils_1 = require("../utils/utils");
const getCodes = async (blockHash) => {
    const codeData = await connector_1.nodeProvider.query((provider) => provider.api.query.evm.codes.entriesAt(blockHash));
    return codeData
        .map(([key, data]) => [key.toHuman()?.toString(), data.toHuman()?.toString()])
        .reduce((acc, [key, data]) => ({ ...acc, [key]: data }), {});
};
exports.default = async (blockNumber) => {
    const blockHash = await connector_1.nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(blockNumber));
    const contractData = await connector_1.nodeProvider.query((provider) => provider.api.query.evm.accounts.entriesAt(blockHash));
    const codes = await getCodes(blockHash);
    const contracts = contractData.map(([key, data]) => {
        const contract = data.toHuman();
        return {
            address: key.toHuman()?.toString() || undefined,
            codeHash: contract?.contractInfo?.codeHash || undefined,
            maintainer: contract?.contractInfo?.maintainer || undefined,
        };
    })
        .filter(({ address, codeHash, maintainer }) => address && codeHash && maintainer)
        .map(async ({ address, codeHash, maintainer }) => {
        const signer = await connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.accounts(maintainer));
        return [
            (0, utils_1.toChecksumAddress)(address),
            -1,
            signer.toHuman()?.toString() || '0x',
            codes[codeHash],
            '',
            '',
            '0',
            '0',
            (new Date()).toUTCString(),
        ];
    });
    await (0, connector_1.insertV2)(`
    INSERT INTO contract
        (address, extrinsic_id, signer, bytecode, bytecode_context, bytecode_arguments, gas_limit, storage_limit, timestamp)
    VALUES
        %L
    ON CONFLICT (address) DO NOTHING;
    `, await Promise.all(contracts));
};
//# sourceMappingURL=contracts.js.map