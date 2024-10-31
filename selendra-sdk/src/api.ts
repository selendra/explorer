import fs from 'fs';
import { ethers } from 'ethers';
import { logger } from './utils/logger';
import { ApiPromise, WsProvider } from '@polkadot/api';

export class SelendraApi {
  public rpcOrWs: string;

  constructor(rpcOrWs: string) {
    this.rpcOrWs = rpcOrWs;
  }

  evmProvider() {
    const rpcOrWs = this.convertWstoHttp(this.rpcOrWs);

    try {
      return new ethers.JsonRpcProvider(rpcOrWs);
    } catch (error) {
      logger.error('Error connecting ...', error);
    }
  }

  evmWebSocketProvider() {
    const rpcOrWs = this.convertHttpToWs(this.rpcOrWs);

    try {
      return new ethers.WebSocketProvider(rpcOrWs);
    } catch (error) {
      logger.error('Error connecting ...', error);
    }
  }

  async subtrateProvider(apiCustomTypes?: string | undefined) {
    const rpcOrWs = this.convertHttpToWs(this.rpcOrWs);

    try {
      let api: ApiPromise;
      const provider = new WsProvider(rpcOrWs);
      logger.debug(`Connecting to ${rpcOrWs}`);

      provider.on('disconnected', () => {
        logger.error(`Got disconnected from provider ${rpcOrWs}`);
      });

      provider.on('error', (error) =>
        logger.error(`Got error from provider: ${error}!`),
      );

      if (apiCustomTypes && apiCustomTypes !== '') {
        const types = JSON.parse(
          fs.readFileSync(`./src/types/${apiCustomTypes}`, 'utf8'),
        );
        api = await ApiPromise.create({ provider, types });
      } else {
        api = await ApiPromise.create({ provider, noInitWarn: true });
      }

      api.on('disconnected', () => logger.error('Got disconnected from API!'));
      api.on('error', (error) => logger.error(`Got error from API: ${error}`));

      return await api.isReady;
    } catch (error) {
      logger.error('Error connecting ...', error);
    }
  }

  private convertHttpToWs(url: string): string {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return url;
    }
    return url.replace(/^http(s?):\/\//, (_, p1) => (p1 ? 'wss://' : 'ws://'));
  }

  private convertWstoHttp(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return url.replace(/^ws(s?):\/\//, (_, p1) =>
      p1 ? 'https://' : 'http://',
    );
  }
}
