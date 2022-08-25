import { query, insert } from '../utils';

interface BlockID {
  id: string;
}

interface InsertInitialBlock {
  id: number;
  hash: string;
  author: string;
  stateRoot: string;
  timestamp: string;
  parentHash: string;
  extrinsicRoot: string;
}

const blockValuesStatement = ({
  id,
  hash,
  author,
  stateRoot,
  parentHash,
  extrinsicRoot,
  timestamp,
}: InsertInitialBlock): any[] => [id, hash, author, stateRoot, parentHash, extrinsicRoot, 'false', timestamp];

export const insertMultipleBlocks = async (
  data: InsertInitialBlock[],
): Promise<void> => insert(`
INSERT INTO block
    (id, hash, author, state_root, parent_hash, extrinsic_root, finalized, timestamp)
  VALUES
    %L
  ON CONFLICT (id) DO UPDATE SET
    author = EXCLUDED.author,
    finalized = EXCLUDED.finalized,
    timestamp = EXCLUDED.timestamp,
    state_root = EXCLUDED.state_root,
    parent_hash = EXCLUDED.parent_hash,
    extrinsic_root = EXCLUDED.extrinsic_root,
    hash = EXCLUDED.hash;
`, data.map(blockValuesStatement));

export const insertBlock = async (
  data: InsertInitialBlock,
): Promise<void> => insertMultipleBlocks([data]);

export const lastBlockInDatabase = async (): Promise<number> => {
  const result = await query<BlockID>(
    'SELECT ID FROM block WHERE finalized = true ORDER By id DESC LIMIT 1',
  );
  return result.length === 0 ? -1 : parseInt(result[0].id, 10);
};

export const updateBlockFinalized = async (id: number) => query(
  `UPDATE block SET finalized = true WHERE id = ${id};`,
);

export const deleteUnfinishedBlocks = async () => query('DELETE FROM block WHERE finalized = false;');
