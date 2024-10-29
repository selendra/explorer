
interface TotalEvmTransaction {
  transation: number,
  contract_transation: number,
}

interface EvmBlock {
  total_transaction: TotalEvmTransaction,
  gasLimit: number,
  gasUsed: number,
  baseFeePerGas: number,
  extraData: string
}

export interface Block {
  block_number: number,
  block_finalized: boolean,
  block_hash: string,
  block_author: string,
  block_parentHash: string,
  extrinsics_root: string,
  state_root: string,
  active_era: number,
  session_index: number,
  total_events: number,
  total_extrinsics: number,
  evm_detail: EvmBlock,
  timestamp: number,
}