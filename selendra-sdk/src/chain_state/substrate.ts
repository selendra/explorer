import { logger } from '../utils/logger';
import { ApiPromise } from '@polkadot/api';
import { BlockDetail } from '../interface';

export class SubstrateChainState {
  private api: ApiPromise;
  
  constructor(provider: ApiPromise) {
    this.api = provider;
  }

  async getIdentityInfo(blockAuthor: string) {
    try {
      return (await this.api.derive.accounts.info(blockAuthor)).identity;
    } catch (error) {
      logger.error('Error fetching Identity details', error);
    }
  }

  async getBlockDetails(blockNumber: number): Promise<BlockDetail> {
    try {
      const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
      const apiAt = await this.api.at(blockHash);
      const activeEra: any = (await apiAt.query?.staking.activeEra()).toJSON();
      const [
        derivedBlock,
        runtimeVersion,
        currentIndex,
      ] = await Promise.all([
        this.api.derive.chain.getBlock(blockHash),
        this.api.rpc.state.getRuntimeVersion(blockHash),
        apiAt.query.session.currentIndex(),
      ]);
      const { block, author, events: blockEvents } = derivedBlock;

      // genesis block doesn't have author
      const blockAuthor = author ? author.toString() : '';

      const { parentHash, extrinsicsRoot, stateRoot } = block.header;
      

      // genesis block doesn't expose timestamp or any other extrinsic
      const timestamp =
        blockNumber !== 0
          ? parseInt(
            block.extrinsics
              .find(
                ({ method: { section, method } }) =>
                  section === 'timestamp' && method === 'set',
              )
              .args[0].toString(),
            10,
          )
          : 0;

      // // Totals
      const totalEvents = blockEvents.length;
      const totalExtrinsics = block.extrinsics.length;

      return {
        block_hash: blockHash.toString(),
        block_author: blockAuthor,
        block_parentHash: parentHash.toString(),
        extrinsics_root: extrinsicsRoot.toString(),
        state_root: stateRoot.toString(),
        active_era: activeEra.index,
        session_index: Number(currentIndex.toString()),
        runtimeVersion: {
          spec_name: runtimeVersion.specName.toString(),
          impl_name: runtimeVersion.implName.toString(),
          authoring_version: Number(runtimeVersion.authoringVersion.toString()),
          spec_version: Number(runtimeVersion.specVersion.toString()),
          impl_version: Number(runtimeVersion.implVersion.toString()),
          transaction_version: Number(runtimeVersion.transactionVersion.toString()),
          stateVersion: Number(runtimeVersion.stateVersion.toString()),
        },
        total_events: totalEvents,
        total_extrinsics: totalExtrinsics,
        timestamp: timestamp,
      };

    } catch (error) {
      logger.error('Error fetching block details', error);
    }
  }
}