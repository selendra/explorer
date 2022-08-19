"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@apollo/client/core");
const pg_format_1 = __importDefault(require("pg-format"));
const connector_1 = require("../utils/connector");
const logger_1 = __importDefault(require("../utils/logger"));
const utils_1 = require("../utils/utils");
const loadVerifiedContractAddresses = async (server) => server.query({
    query: (0, core_1.gql) `
      query verified_addresses {
        verified_contract {
          address
        }
      }    
    `,
})
    .then((res) => res.data.verified_contract
    .map(({ address }) => address));
const insertVerifiedContracts = async (contracts) => {
    await (0, connector_1.queryv2)((0, pg_format_1.default)(`INSERT INTO verified_contract
        (address, name, filename, source,  optimization, compiler_version, compiled_data,  args, runs, target, type, contract_data)
      VALUES 
        %L
      ON CONFLICT DO NOTHING;`, contracts.map((c) => [
        (0, utils_1.toChecksumAddress)(c.address),
        c.name,
        c.filename,
        JSON.stringify(c.source),
        c.optimization,
        c.compiler_version,
        JSON.stringify(c.compiled_data),
        JSON.stringify(c.args),
        c.runs,
        c.target,
        c.type,
        JSON.stringify(c.contract_data),
    ])));
};
const loadVerifiedContracts = async (addresses) => connector_1.liveGraphqlServer
    .query({
    query: (0, core_1.gql) `
      query verified_contracts($address: String_comparison_exp!) {
        verified_contract(
          where: { address: $address }
        ) {
          address
          args
          compiled_data
          compiler_version
          contract_data
          filename
          name
          optimization
          runs
          source
          target
          timestamp
          type
        }
      }    
    `,
    variables: { address: { _in: addresses } },
})
    .then((res) => res.data.verified_contract);
const localVerifiedContractsAddresses = async () => (0, connector_1.queryv2)('SELECT address FROM verified_contract')
    .then((res) => res.map(({ address }) => address))
    .then((res) => res.map((val) => val.toLocaleLowerCase()));
exports.default = async () => {
    logger_1.default.info('Loading verified contract addresses');
    const localVerifiedContracts = await localVerifiedContractsAddresses();
    const liveVerifiedContracts = await loadVerifiedContractAddresses(connector_1.liveGraphqlServer);
    const missingContracts = liveVerifiedContracts
        .filter((address) => !localVerifiedContracts.includes(address.toLocaleLowerCase()));
    if (missingContracts.length === 0) {
        return;
    }
    logger_1.default.info(`Loading following missing contracts: \n- ${missingContracts.join('\n- ')}`);
    const contracts = await loadVerifiedContracts(missingContracts);
    logger_1.default.info('Inserting missing contracts');
    await insertVerifiedContracts(contracts);
    logger_1.default.info('Verified contract sync complete');
};
//# sourceMappingURL=syncVerifiedContracts.js.map