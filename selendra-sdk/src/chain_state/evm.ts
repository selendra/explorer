import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface EnvBlockDetail {
  number: number
  hash: string
  parentHash: string
  gasLimit: number
  gasUsed: number
  timestamp: number
}

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

  async getTransaction(blockNumber: number) {
    let transaction: ethers.TransactionResponse[] = [];
    try {
      const block = await this.provider.getBlock(blockNumber);
      if (block) {
        for (const txHash of block.transactions) {
          const tx = await this.provider.getTransaction(txHash);
          transaction.push(tx);
        }
      }
    } catch (error) {
      
    }
  }
}
