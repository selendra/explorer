import { insert } from '../utils';
import { Transferv2 } from '../types';

const transferToValue = ({
  type,
  denom,
  nftId,
  amount,
  blockId,
  success,
  timestamp,
  toAddress,
  feeAmount,
  extrinsicId,
  fromAddress,
  tokenAddress,
  errorMessage,
  toEvmAddress,
  fromEvmAddress,
}: Transferv2): any[] => [blockId, extrinsicId, denom || null, nftId || null, toAddress === 'null' ? null : toAddress, fromAddress === 'null' ? null : fromAddress, toEvmAddress, fromEvmAddress, tokenAddress, amount === '' ? '0' : amount, feeAmount === '' ? '0' : feeAmount, success, errorMessage, type, timestamp];

// eslint-disable-next-line import/prefer-default-export
export const insertTransfers = async (transfers: Transferv2[]): Promise<void> => {
  if (transfers.length === 0) {
    return;
  }
  await insert(`
    INSERT INTO transfer
     (block_id, extrinsic_id, denom, nft_id, to_address, from_address, to_evm_address, from_evm_address, token_address, amount, fee_amount, success, error_message, type, timestamp)
    VALUES
     %L;
    `, transfers.map(transferToValue));
};
