"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceOfErc1155 = exports.balanceOf = exports.findNativeAddress = void 0;
const ethers_1 = require("ethers");
const connector_1 = require("../utils/connector");
const findNativeAddress = async (evmAddress) => {
    const address = await connector_1.nodeProvider.query((provider) => provider.api.query.evmAccounts.accounts(evmAddress));
    return address.toString();
};
exports.findNativeAddress = findNativeAddress;
const balanceOf = async (address, token, abi) => {
    const contract = new ethers_1.Contract(token, abi, connector_1.nodeProvider.getProvider());
    const balance = await contract.balanceOf(address);
    return balance.toString();
};
exports.balanceOf = balanceOf;
const balanceOfErc1155 = async (address, token, nft, abi) => {
    const contract = new ethers_1.Contract(token, abi, connector_1.nodeProvider.getProvider());
    const balance = await contract.balanceOf(address, nft);
    return balance.toString();
};
exports.balanceOfErc1155 = balanceOfErc1155;
//# sourceMappingURL=utils.js.map