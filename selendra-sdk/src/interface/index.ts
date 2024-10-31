import { AnyTuple } from '@polkadot/types/types';
import { GenericExtrinsic } from '@polkadot/types';
import { EventRecord } from '@polkadot/types/interfaces';

export interface RuntimeVersion {
  spec_name: string;
  impl_name: string;
  authoring_version: number;
  spec_version: number;
  impl_version: number;
  transaction_version: number;
  stateVersion: number;
}

export interface BlockDetail {
  block_hash: string
  block_author: string
  block_parentHash: string
  extrinsics_root: string
  state_root: string
  active_era: number
  session_index: number
  runtimeVersion: RuntimeVersion
  total_events: number
  total_extrinsics: number
  timestamp: number
}

export interface EventDetail {
  event_index: number
  section: string
  method: string
  phase: string
  types: string
  doc: string
  data: string
}

export interface ExtrinsicDetail {
  extrinsic_index: number,
  hash: string
  section: string
  method: string
  isSigned: boolean
  signer: string
  args: string
  argsDef: string
  doc: string
  extrinsics_status: ExtrinsicsStatus,
  transfer?: SubstrateTransfer,
}

export interface ExtrinsicsStatus {
  success: boolean,
  error_message: string
}

export interface SubstrateTransfer {
  from: string,
  to: string,
  amount: BigInt
}

export type IndexedBlockEvent = [number, EventRecord];
export type IndexedBlockExtrinsic = [number, GenericExtrinsic<AnyTuple>];
