"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const evmEvent_1 = require("../../../queries/evmEvent");
const utils_1 = require("../../../utils/utils");
const ClaimEvmAccountEvent_1 = __importDefault(require("./ClaimEvmAccountEvent"));
const CreateContractEvent_1 = __importDefault(require("./CreateContractEvent"));
const DefaultEvent_1 = __importDefault(require("./DefaultEvent"));
const EndowedEvent_1 = __importDefault(require("./EndowedEvent"));
const EvmLogEvent_1 = __importDefault(require("./EvmLogEvent"));
const ExecutedFailedEvent_1 = __importDefault(require("./ExecutedFailedEvent"));
const KillAccountEvent_1 = __importDefault(require("./KillAccountEvent"));
const ReservedEvent_1 = __importDefault(require("./ReservedEvent"));
const StakingEvent_1 = __importDefault(require("./StakingEvent"));
const Erc1155BatchTransferEvent_1 = __importDefault(require("./transfer/Erc1155BatchTransferEvent"));
const Erc1155SingleTransferEvent_1 = __importDefault(require("./transfer/Erc1155SingleTransferEvent"));
const Erc20TransferEvent_1 = __importDefault(require("./transfer/Erc20TransferEvent"));
const Erc721TransferEvent_1 = __importDefault(require("./transfer/Erc721TransferEvent"));
const NativeTransferEvent_1 = __importDefault(require("./transfer/NativeTransferEvent"));
const UnverifiedEvmLog_1 = __importDefault(require("./UnverifiedEvmLog"));
const UnverifiedExecutedFailedEvent_1 = __importDefault(require("./UnverifiedExecutedFailedEvent"));
const selectEvmLogEvent = async (head) => {
    const contractData = head.event.event.data.toJSON()[0];
    // Retrieving contract data from db
    const contract = await (0, evmEvent_1.getContractDB)((0, utils_1.toChecksumAddress)(contractData.address));
    // If contract does not exist we can not verified evm log content
    // therefore log is marked as unverified
    if (contract.length === 0)
        return new UnverifiedEvmLog_1.default(head);
    // Decoding contract event
    const { type, compiled_data, name } = contract[0];
    const abi = new ethers_1.utils.Interface(compiled_data[name]);
    const decodedEvent = abi.parseLog(contractData);
    const eventName = `${decodedEvent.name}.${type}`;
    // Handling transfer events
    switch (eventName) {
        case 'Transfer.ERC20':
            return new Erc20TransferEvent_1.default(head, contract[0]);
        case 'Transfer.ERC721':
            return new Erc721TransferEvent_1.default(head, contract[0]);
        case 'TransferSingle.ERC1155':
            return new Erc1155SingleTransferEvent_1.default(head, contract[0]);
        case 'TransferBatch.ERC1155':
            return new Erc1155BatchTransferEvent_1.default(head, contract[0]);
        default:
            return new EvmLogEvent_1.default(head, contract[0]);
    }
};
const selectExecutionFailedEvent = async (head) => {
    const contractData = head.event.event.data.toJSON()[0];
    // Retrieving contract data from db
    const contract = await (0, evmEvent_1.getContractDB)((0, utils_1.toChecksumAddress)(contractData.address));
    // If contract does not exist we can not verified evm execution failed content
    if (contract.length === 0)
        return new UnverifiedExecutedFailedEvent_1.default(head);
    return new ExecutedFailedEvent_1.default(head, contract[0]);
};
const resolveEvent = async (head) => {
    // Compressing event section and method
    const eventCompression = `${head.event.event.section.toString()}.${head.event.event.method.toString()}`;
    // Decoding native events
    switch (eventCompression) {
        case 'evm.Log': return selectEvmLogEvent(head);
        case 'evm.ExecutedFailed': return selectExecutionFailedEvent(head);
        case 'evm.Created': return new CreateContractEvent_1.default(head);
        case 'evmAccounts.ClaimAccount': return new ClaimEvmAccountEvent_1.default(head);
        case 'balances.Endowed': return new EndowedEvent_1.default(head);
        case 'balances.Reserved': return new ReservedEvent_1.default(head);
        case 'balances.Transfer': return new NativeTransferEvent_1.default(head);
        case 'staking.Rewarded': return new StakingEvent_1.default(head);
        case 'system.KilledAccount': return new KillAccountEvent_1.default(head);
        default: return new DefaultEvent_1.default(head);
    }
};
exports.default = resolveEvent;
//# sourceMappingURL=index.js.map