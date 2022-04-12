const { ApiPromise, WsProvider } = require('@polkadot/api');
const { backendConfig } = require('../config');
const logger = require('./logger');

module.exports.apiProvider = async () => {
    const wsProvider = new WsProvider(backendConfig.wsProviderUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    return api
}

module.exports.getAPI = async (apiCustomTypes="")=> {
    let api;
    logger.info(`Connecting to ${backendConfig.wsProviderUrl}`);
    const provider = new WsProvider(backendConfig.wsProviderUrl);
  
    provider.on('disconnected', () =>
      logger.error(`Got disconnected from provider ${backendConfig.wsProviderUrl}`),
    );
    provider.on('error', (error) =>
      logger.error(`Got error from provider: ${error}!`),
    );
  
    if (apiCustomTypes && apiCustomTypes !== '') {
      const types = JSON.parse(
        fs.readFileSync(`../type/${apiCustomTypes}`, 'utf8'),
      );
      api = new ApiPromise({ provider, types });
    } else {
      api = new ApiPromise({ provider });
    }
  
    api.on('disconnected', () => logger.error('Got disconnected from API!'),
    );
    api.on('error', (error) => logger.error(`Got error from API: ${error}`));
  
    await api.isReady;
    return api;
};

module.exports.isNodeSynced = async (api) => {
    let node;
    try {
        node = await api.rpc.system.health();
    } catch (error) {
        logger.error("Can't query node status");
        Sentry.captureException(error);
    }
    if (node && node.isSyncing.eq(false)) {
        logger.info('Node is synced!');
        return true;
    }
    logger.info('Node is NOT synced!');
    return false;
};