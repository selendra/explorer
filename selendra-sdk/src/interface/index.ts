export interface RuntimeVersion {
  spec_name: string,
  impl_name: string,
  authoring_version: number,
  spec_version: number,
  impl_version: number,
  transaction_version: number
  stateVersion: number
}

export interface BlockDetail {
  block_hash: string,
  block_author: string,
  block_parentHash: string,
  extrinsics_root: string,
  state_root: string,
  active_era: number,
  session_index: number,
  runtimeVersion: RuntimeVersion,
  total_events: number,
  total_extrinsics: number,
  timestamp: number,
}