"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extrinsicStatus = exports.resolveSigner = void 0;
const connector_1 = require("../utils/connector");
const resolveSigner = (extrinsic) => extrinsic.signer?.toString() || 'deleted';
exports.resolveSigner = resolveSigner;
const extractErrorMessage = (error) => {
    if (error.isModule) {
        const errorModule = error.asModule;
        const { docs, name, section } = errorModule.registry.findMetaError(errorModule);
        return `${section}.${name}: ${docs}`;
    }
    return error.toString();
};
const extrinsicStatus = (extrinsicEvents) => extrinsicEvents.reduce((prev, { event }) => {
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
exports.extrinsicStatus = extrinsicStatus;
//# sourceMappingURL=extrinsic.js.map