const { ApiPromise, WsProvider } = require('@polkadot/api');
const constants = require('../config');

module.exports.apiProvider = async () => {
    const wsProvider = new WsProvider(constants.PROVIDER);
    const api = await ApiPromise.create({ provider: wsProvider });
    return api
}

