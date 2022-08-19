import { query } from '../utils';

interface BlockID {
  id: string;
}

export const lastBlockInDatabase = async (): Promise<number> => {
  const result = await query<BlockID>(
    'SELECT ID FROM block WHERE finalized = true ORDER By id DESC LIMIT 1',
  );
  return result.length === 0 ? -1 : parseInt(result[0].id, 10);
};

export const deleteUnfinishedBlocks = async () => query('DELETE FROM block WHERE finalized = false;');
