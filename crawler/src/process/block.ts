import type { BlockHash } from '@polkadot/types/interfaces/chain';
import { Block } from '../types';
import { insertBlock, updateBlockFinalized } from '../crud';
import { nodeProvider } from '../utils';
import logger from '../utils/logger';

const blockBody = async (id: number, hash: BlockHash): Promise<Block> => {
  const provider = nodeProvider.getProvider();
  const [signedBlock, extendedHeader, events] = await Promise.all([
    provider.api.rpc.chain.getBlock(hash),
    provider.api.derive.chain.getHeader(hash),
    provider.api.query.system.events.at(hash),
  ]);

  // Parse the timestamp from the `timestamp.set` extrinsic
  const firstExtrinsic = signedBlock.block.extrinsics[0];

  let timestamp;
  if (
    firstExtrinsic
    && firstExtrinsic.method.section === 'timestamp'
    && firstExtrinsic.method.method === 'set'
  ) {
    timestamp = new Date(Number(firstExtrinsic.method.args)).toUTCString();
  } else {
    timestamp = await provider.api.query.timestamp.now.at(hash);
    timestamp = new Date(timestamp.toJSON()).toUTCString();
  }

  return {
    id,
    hash,
    signedBlock,
    extendedHeader,
    events,
    timestamp,
  };
};

const formateBlockBody = ({
  id,
  hash,
  extendedHeader,
  signedBlock,
  timestamp,
}: Block) => ({
  id,
  timestamp,
  finalized: false,
  hash: hash.toString(),
  author: extendedHeader?.author?.toString() || '',
  parentHash: signedBlock.block.header.parentHash.toString(),
  stateRoot: signedBlock.block.header.stateRoot.toString(),
  extrinsicRoot: signedBlock.block.header.extrinsicsRoot.toString(),
});

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

  const hash = await nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(blockId));

  // Load block
  logger.info(`Loading block for: ${blockId}`);
  const block = await blockBody(blockId, hash);

  // Inserting initial block and marking it as unfinalized
  logger.info(`Inserting unfinalized block: ${blockId}`);
  await insertBlock(formateBlockBody(block));

  // Updating block finalization
  logger.info(`Finalizing block ${blockId}`);
  await updateBlockFinalized(blockId);
};

// eslint-disable-next-line import/prefer-default-export
export const processUnfinalizedBlock = async (id: number) => {
  logger.info(`New unfinalized head detected ${id}`);
  const hash = await nodeProvider.query((provider) => provider.api.rpc.chain.getBlockHash(id));

  // Insert blocks
  logger.info('Inserting unfinalized block');
  await insertBlock(formatUnfinalizedBlock(id, hash));
};
