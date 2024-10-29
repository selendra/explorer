import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export class EvmChainState {
  public provider: ethers.Provider;
  
  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async getBlockDetails(blockNumber: number) {
    try {
      return await this.provider.getBlock(blockNumber);
    } catch (error) {
      logger.error('Error fetching block details', error);
    }
  }
}