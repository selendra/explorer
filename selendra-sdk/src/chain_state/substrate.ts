/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unused-vars */
import { logger } from '../utils/logger';
import { ApiPromise } from '@polkadot/api';
import { BlockDetail, EventDetail, ExtrinsicDetail, ExtrinsicsStatus, IndexedBlockEvent, IndexedBlockExtrinsic, SubstrateTransfer } from '../interface';
import { chunker } from '../utils';

export interface IdentityDetail {
  display_name: string
  legal_name: string
  displayParent: string
  parent_account: string
  discord: string
  email: string
  github: string
  matrix: string
  riot: string
  twitter: string
  web: string
  image: string
  judgements: string[]
  pgp_fingerprint: string
  other: string
}

export class SubstrateChainState {
  public api: ApiPromise;

  public blockHash: string; 
  
  constructor(provider: ApiPromise) {
    this.api = provider;
  }

  async getIdentityInfo(address: string): Promise<IdentityDetail> {
    try {
      const identity = (await this.api.derive.accounts.info(address)).identity;

      const judgments = identity.judgements.map((judgement) => {
        return judgement[1].toString();
      });

      return {
        display_name: identity.display ? identity.display : '',
        legal_name: identity.legal ? identity.legal : '',
        displayParent: identity.displayParent ? identity.displayParent : '',
        parent_account: JSON.stringify(identity.parent),
        discord: identity.discord ? identity.discord : '',
        email: identity.email ? identity.email : '',
        github: identity.github ? identity.github : '',
        matrix: identity.matrix ? identity.discord : '',
        riot: identity.riot ? identity.riot : '',
        twitter: identity.twitter ? identity.twitter : '',
        web: identity.web ? identity.web : '',
        image: identity.image ? identity.image : '',
        judgements: judgments,
        pgp_fingerprint: identity.pgp ? JSON.stringify(identity.pgp) : '',
        other: identity.other ? JSON.stringify(identity.other) : '',
      };
      
    } catch (error) {
      logger.error(`Error fetching Identity details ${error}`);
    }
  }

  async getBlockHash(blockNumber: number) {
    this.blockHash = (await (this.api.rpc.chain.getBlockHash(blockNumber))).toString();
    return this.blockHash;
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
      logger.error(`Error fetching block details: ${error}`);
    }
  }

  async getBlockEvent(blockNumber: number): Promise<EventDetail[]> {
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
      logger.error(`Error fetching event details ${error}`);
    }
  }

  async getExtrinsicDetails(blockNumber: number): Promise<ExtrinsicDetail[]> {
    try {
      await this.getBlockHash(blockNumber);

      const { block, events: blockEvents } = await this.api.derive.chain.getBlock(this.blockHash);

      const indexedExtrinsics = block.extrinsics.map(
        (extrinsic, index) => [index, extrinsic],
      );

      let extrinsicData: ExtrinsicDetail[] = [];
      const chunks = chunker(indexedExtrinsics, block.extrinsics.length);

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async (indexedExtrinsic: IndexedBlockExtrinsic) => {
            const [extrinsicIndex, extrinsic] = indexedExtrinsic;
            const { isSigned } = extrinsic;

            const signer = isSigned ? extrinsic.signer.toString() : '';
            const section = extrinsic.method.section;
            const method = extrinsic.method.method;
            const args = JSON.stringify(extrinsic.method.args);
            const argsDef = JSON.stringify(extrinsic.argsDef);
            const hash = extrinsic.hash.toHex();
            const doc = JSON.stringify(extrinsic.meta.docs.toJSON());

            const extrinsicsStatus = await this.checkExtrinsicStatus(
              blockEvents, 
              Number(indexedExtrinsic.toString()),
            );

            const transfer = this.processTransferExtrinsics(
              blockEvents,
              method,
              signer,
              args,
              extrinsicsStatus.success,
              extrinsicIndex,
            );

            const data: ExtrinsicDetail = {
              extrinsic_index: extrinsicIndex,
              hash,
              section,
              method,
              isSigned,
              signer,
              args,
              argsDef,
              doc,
              extrinsics_status: extrinsicsStatus,
              transfer,
            };
            extrinsicData.push(data);
          }),          
        );
      }

      return extrinsicData;
    }  catch (error) {
      logger.error(`Error fetching extrinsic details ${error}`);
      console.log(error);
    }
  }

  private processTransferExtrinsics(
    blockEvents: any[],
    method: string,
    signer: string,
    args: string,
    success: boolean,
    extrinsicIndex: number,
  ): SubstrateTransfer  {
    const fromSource = signer;
    let toDestination = '';

    if (JSON.parse(args)[0].id) {
      toDestination = JSON.parse(args)[0].id;
    } else if (JSON.parse(args)[0].address20) {
      toDestination = JSON.parse(args)[0].address20;
    } else {
      toDestination = JSON.parse(args)[0];
    }
    
    let amount;
    if (method === 'transferAll' && success) {
      // Equal source and destination addres doesn't trigger a balances.Transfer event
      amount =
        fromSource === toDestination
          ? 0
          : this.getTransferAllAmount(blockEvents, extrinsicIndex);
    } else if (method === 'transferAll' && !success) {
      // no event is emitted so we can't get amount
      amount = 0;
    } else if (method === 'forceTransfer') {
      amount = JSON.parse(args)[2];
    } else {
      amount = JSON.parse(args)[1]; // 'transfer' and 'transferKeepAlive' methods
    }

    return {
      from: fromSource,
      to: toDestination,
      amount: BigInt(amount ? amount : 0),
    };
  }

  private getTransferAllAmount(
    blockEvents: any[],
    index: number,
  ): string {
    try {
      return blockEvents
        .find(
          ({ event, phase }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index) &&
            event.section === 'balances' &&
            event.method === 'Transfer',
        )
        .event.data[2].toString();
    } catch (error) {
      logger.error(`Error fetching transfer amount: ${error}`);
    }
  }

  private async checkExtrinsicStatus(
    blockEvents: any[],
    index: number,
  ): Promise<ExtrinsicsStatus> {
    let extrinsicSuccess: boolean = false;
    let extrinsicErrorMessage: string = '';

    try {
      const apiAt = await this.api.at(this.blockHash);

      blockEvents
        .filter(
          ({ phase }) =>
            phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index),
        ).forEach(({ event }) => {
          if (apiAt.events.system.ExtrinsicSuccess.is(event)) {
            extrinsicSuccess = true;
          } else if (apiAt.events.system.ExtrinsicFailed.is(event)) {
            const [ dispatchError ] = event.data.toJSON() as any;
            if (dispatchError.isModule) {
              let decoded;
              try {
                decoded = apiAt.registry.findMetaError(dispatchError.asModule);
                extrinsicErrorMessage = `${decoded.name}: ${decoded.docs}`;
              } catch (_) {
                extrinsicErrorMessage = 'Unknow error';
              }
            } else {
              extrinsicErrorMessage = dispatchError.toString();
            }
          }
         
        });
      return { 
        success: extrinsicSuccess,
        error_message: extrinsicErrorMessage,
      };
    } catch (error) {
      logger.error(`Error fetching extrinsic success or error message: ${error}`);
    }
  }
}