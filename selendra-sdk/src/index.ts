export { SelendraApi } from './api';
export { EvmChainState, SubstrateChainState } from './chain_state';

import { SelendraApi } from './api';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SubstrateChainState, EvmChainState } from './chain_state';

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function main() {
  const selendraApi = new SelendraApi('https://rpc.selendra.org');
  let api = await selendraApi.evmProvider();
  // const substrate = new SubstrateChainState(api);
  const evm = new EvmChainState(api);
  console.log(await evm.getBlockDetails(7687398));
  // console.log(await evm.getTransaction(7687398));

  // console.log(await substrate.getBlockData(7_424_891));
  // await substrate.getBlockEvent(7_431_654);
  // console.log(await substrate.getExtrinsicDetails(7577752));
  // console.log(await substrate.getAccontBalanceInfo('5D2zu5mBct9CwjLhCMkz2xTXHWzG2GmDk4tYeBjm5MaYwuV7'));
  // api.disconnect();
}

// Execute the main function and handle any errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
