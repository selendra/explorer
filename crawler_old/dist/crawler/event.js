"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExtrinsicEvent = exports.isEventStakingSlash = exports.isEventStakingReward = exports.accountHeadToBody = exports.accountNewOrKilled = exports.extrinsicToEventHeader = void 0;
const connector_1 = require("../utils/connector");
const utils_1 = require("../utils/utils");
const extrinsicToEventHeader = ({ id, blockId, events, timestamp, index: extrinsicIndex, status, signedData, }) => events.map((event, index) => ({
    event,
    index,
    blockId,
    timestamp,
    extrinsicId: id,
    extrinsicIndex,
    status,
    signedData,
}));
exports.extrinsicToEventHeader = extrinsicToEventHeader;
const eventToAccountHead = ({ blockId, event, timestamp }, active = true) => {
    const address = event.event.data[0].toString();
    return [{
            blockId, address, active, timestamp,
        }];
};
const accountNewOrKilled = (eventHead) => {
    const { event, blockId, timestamp } = eventHead;
    if (connector_1.nodeProvider.getProvider().api.events.balances.Endowed.is(event.event)) {
        return eventToAccountHead(eventHead);
    }
    if (connector_1.nodeProvider.getProvider().api.events.staking.Rewarded.is(event.event)) {
        return eventToAccountHead(eventHead);
    }
    if (connector_1.nodeProvider.getProvider().api.events.staking.Slashed.is(event.event)) {
        return eventToAccountHead(eventHead);
    }
    if (connector_1.nodeProvider.getProvider().api.events.system.KilledAccount.is(event.event)) {
        return eventToAccountHead(eventHead, false);
    }
    if (connector_1.nodeProvider.getProvider().api.events.balances.Reserved.is(event.event)) {
        return eventToAccountHead(eventHead);
    }
    if (connector_1.nodeProvider.getProvider().api.events.balances.Transfer.is(event.event)) {
        const res = event.event.data.toJSON();
        return [
            {
                blockId, address: res[0], active: true, timestamp,
            },
            {
                blockId, address: res[1], active: true, timestamp,
            },
        ];
    }
    return [];
};
exports.accountNewOrKilled = accountNewOrKilled;
const accountHeadToBody = async (head) => {
    const [evmAddress, balances, identity] = await Promise.all([
        connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.evmAddresses(head.address)),
        connector_1.nodeProvider.query((provider) => provider.api.derive.balances.all(head.address)),
        connector_1.nodeProvider.query((provider) => provider.api.derive.accounts.identity(head.address)),
    ]);
    const address = evmAddress.toString();
    const eddress = address !== ''
        ? (0, utils_1.toChecksumAddress)(address)
        : address;
    const evmNonce = address !== ''
        ? await connector_1.nodeProvider.query((provider) => provider.api.query.evm.accounts(address))
            .then((res) => res.toJSON())
            .then((res) => res?.nonce || 0)
        : 0;
    return {
        ...head,
        evmAddress: eddress,
        freeBalance: balances.freeBalance.toString(),
        lockedBalance: balances.lockedBalance.toString(),
        availableBalance: balances.availableBalance.toString(),
        vestedBalance: balances.vestedBalance.toString(),
        votingBalance: balances.votingBalance.toString(),
        reservedBalance: balances.reservedBalance.toString(),
        identity: JSON.stringify(identity),
        nonce: balances.accountNonce.toString(),
        evmNonce,
    };
};
exports.accountHeadToBody = accountHeadToBody;
const isEventStakingReward = ({ event: { event } }) => connector_1.nodeProvider.getProvider().api.events.staking.Rewarded.is(event);
exports.isEventStakingReward = isEventStakingReward;
const isEventStakingSlash = ({ event: { event } }) => connector_1.nodeProvider.getProvider().api.events.staking.Slashed.is(event);
exports.isEventStakingSlash = isEventStakingSlash;
const isExtrinsicEvent = (extrinsicIndex) => ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex);
exports.isExtrinsicEvent = isExtrinsicEvent;
//# sourceMappingURL=event.js.map