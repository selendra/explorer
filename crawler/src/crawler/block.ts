import type { BlockHash } from '@polkadot/types/interfaces/chain';
import { insertBlock } from '../crud';
import { nodeProvider } from '../utils';
import logger from '../utils/logger';

const formatUnfinalizedBlock = (id: number, hash: BlockHash) => ({
  id,
  finalized: false,
  hash: hash.toString(),
  timestamp: `${new Date().toUTCString()}`,
  author: '',
  parentHash: '',
  stateRoot: '',
  extrinsicRoot: '',
});

export const processBlock = async (blockId: number): Promise<void> => {
  logger.info('--------------------------------');
  // Load block hash
  logger.info(`Loading block hash for: ${blockId}`);
};

// eslint-disable-next-line import/prefer-default-export
export const processUnfinalizedBlock = async (id: number) => {
  logger.info(`New unfinalized head detected ${id}`);
  const hash = await nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(id));

  // Insert blocks
  logger.info('Inserting unfinalized block');
  await insertBlock(formatUnfinalizedBlock(id, hash));
};
