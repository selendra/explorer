"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connector_1 = require("../../utils/connector");
const logger_1 = __importDefault(require("../../utils/logger"));
const extractErrorMessage = (error) => {
    if (error.isModule) {
        const errorModule = error.asModule;
        const { docs, name, section } = errorModule.registry.findMetaError(errorModule);
        return `${section}.${name}: ${docs}`;
    }
    return error.toString();
};
const extrinsicStatus = (extrinsicEvents) => extrinsicEvents.reduce((prev, { head: { event: { event } } }) => {
    if (prev.type === 'unknown'
        && connector_1.nodeProvider.getProvider().api.events.system.ExtrinsicSuccess.is(event)) {
        return { type: 'success' };
    }
    if (connector_1.nodeProvider.getProvider().api.events.system.ExtrinsicFailed.is(event)) {
        const [dispatchedError] = event.data;
        return {
            type: 'error',
            message: extractErrorMessage(dispatchedError),
        };
    }
    return prev;
}, { type: 'unknown' });
class Extrinsic {
    constructor(blockId, index, timestamp, extrinsic, events) {
        this.events = events;
        this.blockId = blockId;
        this.index = index;
        this.timestamp = timestamp;
        this.extrinsic = extrinsic;
    }
    static async getSignedData(hash) {
        const [fee, feeDetails] = await Promise.all([
            connector_1.nodeProvider.query((provider) => provider.api.rpc.payment.queryInfo(hash)),
            connector_1.nodeProvider.query((provider) => provider.api.rpc.payment.queryFeeDetails(hash)),
        ]);
        return {
            fee: fee.toJSON(),
            feeDetails: feeDetails.toJSON(),
        };
    }
    static async nextId() {
        const result = await (0, connector_1.queryv2)('SELECT nextval(\'extrinsic_sequence\');');
        return parseInt(result[0].nextval, 10);
    }
    static async idExists(id) {
        const exist = await (0, connector_1.queryv2)('SELECT id FROM extrinsic WHERE id = $1', [id]);
        return exist.length > 0;
    }
    static async getId() {
        let id = await Extrinsic.nextId();
        while (await Extrinsic.idExists(id)) {
            id = await Extrinsic.nextId();
        }
        return id;
    }
    async process(accountsManager) {
        this.id = await Extrinsic.getId();
        // Extracting signed data
        this.signedData = this.extrinsic.isSigned
            ? await Extrinsic.getSignedData(this.extrinsic.toHex())
            : undefined;
        this.status = extrinsicStatus(this.events);
        // Process all extrinsic events
        logger_1.default.info('Processing extrinsic events');
        await Promise.all(this.events.map(async (event) => event.process(accountsManager)));
    }
    async save() {
        if (!this.id) {
            throw new Error('Extrinsic id was not claimed!');
        }
        if (!this.status) {
            throw new Error('Extrinsic status was not claimed!');
        }
        logger_1.default.info(`Insertin ${this.id} extrinsic`);
        await (0, connector_1.queryv2)(`
      INSERT INTO extrinsic 
        (id, block_id, index, hash, args, docs, method, section, signer, status, error_message, type, signed_data, timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
            this.id,
            this.blockId,
            this.index,
            this.extrinsic.hash.toString(),
            JSON.stringify(this.extrinsic.args),
            this.extrinsic.meta.docs.toLocaleString(),
            this.extrinsic.method.method.toString(),
            this.extrinsic.method.section.toString(),
            this.extrinsic.signer?.toString() || '0x',
            this.status.type,
            this.status.type === 'error' ? this.status.message : '',
            this.extrinsic.signer ? 'signed' : 'unsigned',
            this.signedData ? JSON.stringify(this.signedData) : null,
            this.timestamp,
        ]);
        const extrinsicData = {
            id: this.id,
            index: this.index,
            status: this.status,
            signedData: this.signedData,
            args: this.extrinsic.args,
        };
        await Promise.all(this.events.map(async (event) => event.save(extrinsicData)));
    }
}
exports.default = Extrinsic;
//# sourceMappingURL=Extrinsic.js.map