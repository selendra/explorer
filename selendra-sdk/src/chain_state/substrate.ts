// /* eslint-disable @typescript-eslint/no-unused-vars */
import { logger } from '../utils/logger';
import { ApiPromise } from '@polkadot/api';
import { BlockDetail, IndexedBlockEvent } from '../interface';
import { chunker } from '../utils';


export interface EventDetail {
  event_index: number,
  section: string,
  method: string,
  phase: string,
  types: string
  doc: string,
  data: string,
}

export class SubstrateChainState {
  private api: ApiPromise;

  public blockHash: string; 
  
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

  async getBlockHash(blockNumber: number) {
    this.blockHash = (await (this.api.rpc.chain.getBlockHash(blockNumber))).toString();
  }

  async getBlockDetails(blockNumber: number): Promise<BlockDetail> {
    try {
      await this.getBlockHash(blockNumber);
      const apiAt = await this.api.at(this.blockHash);
      const activeEra: any = (await apiAt.query?.staking.activeEra()).toJSON();
      const [
        derivedBlock,
        runtimeVersion,
        currentIndex,
      ] = await Promise.all([
        this.api.derive.chain.getBlock(this.blockHash),
        this.api.rpc.state.getRuntimeVersion(this.blockHash),
        apiAt.query.session.currentIndex(),
      ]);
      const { block, author, events: blockEvents } = derivedBlock;

      // genesis block doesn't have author
      const blockAuthor = author ? JSON.stringify(author) : '';

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
        block_hash: this.blockHash,
        block_author: blockAuthor,
        block_parentHash: JSON.stringify(parentHash),
        extrinsics_root: JSON.stringify(extrinsicsRoot),
        state_root: JSON.stringify(stateRoot),
        active_era: activeEra.index,
        session_index: Number(JSON.stringify(currentIndex)),
        runtimeVersion: {
          spec_name: JSON.stringify(runtimeVersion.specName),
          impl_name: JSON.stringify(runtimeVersion.implName),
          authoring_version: Number(JSON.stringify(runtimeVersion.authoringVersion)),
          spec_version: Number(JSON.stringify(runtimeVersion.specVersion)),
          impl_version: Number(JSON.stringify(runtimeVersion.implVersion)),
          transaction_version: Number(JSON.stringify(runtimeVersion.transactionVersion)),
          stateVersion: Number(JSON.stringify(runtimeVersion.stateVersion)),
        },
        total_events: totalEvents,
        total_extrinsics: totalExtrinsics,
        timestamp: timestamp,
      };
    } catch (error) {
      logger.error('Error fetching block details', error);
    }
  }

  async getBlockEvent(blockNumber: number) {
    try {
      await this.getBlockHash(blockNumber);
      const { events: blockEvents } = await this.api.derive.chain.getBlock(this.blockHash);

      const IndexedBlockEvents = blockEvents.map(
        (event, index) => [index, event],
      );

      let events: EventDetail[] = [];
      const chunks = chunker(IndexedBlockEvents, blockEvents.length);
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async (indexedEvent: IndexedBlockEvent) => {
            const [eventIndex, { event, phase }] = indexedEvent;
            const doc = JSON.stringify(event.meta.docs.toJSON());
            const types = JSON.stringify(event.typeDef);

            const eventData: EventDetail = {
              event_index: eventIndex,
              section: event.section,
              method: event.method,
              phase: phase.toString(),
              types: types,
              doc: doc,
              data: JSON.stringify(event.data),
            };
            events.push(eventData);
          }),
        );
      }

      return events;
    } catch (error) {
      logger.error('Error fetching event details', error);
    }
  }

  // getExtrinsicDetails(hexExtrinsic: string, blockhash?: string) {
  //   try {
  //     if (!blockhash) {
  //       blockhash = this.blockhash;
  //     }

  //     let extrinsicSuccess = false;
  //     let extrinsicErrorMessage = '';
      
  //     // return this.api
  //   } catch (error) {
  //     logger.error('Error fetching extrinsic fee details details', error);
  //     return 0;
  //   }
  // }
}