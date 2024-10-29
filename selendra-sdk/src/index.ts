export { SelendraApi } from './api';
export { EvmChainState } from './chain_state';

import { SelendraApi } from './api';
import { SubstrateChainState } from './chain_state';

// eslint-disable-next-line @typescript-eslint/no-empty-function
async function main() {
  const selendraApi = new SelendraApi('https://rpc.selendra.org');
  let api = await selendraApi.subtrateProvider();
  const block = new SubstrateChainState(api);

  // console.log(await block.getBlockEvent(7_424_891));
  console.log(await block.getBlockEvent(7_431_654));
}

// Execute the main function and handle any errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});