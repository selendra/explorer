export { SelendraApi } from './api';
export { EvmChainState } from './chain_state';

import { SelendraApi } from './api';
import { SubstrateChainState } from './chain_state';



// eslint-disable-next-line @typescript-eslint/no-empty-function
async function main() {
  const selendraApi = new SelendraApi('https://rpc.selendra.org');
  let api = await selendraApi.subtrateProvider();
  const block = new SubstrateChainState(api);

  await block.getBlockDetails(7_411_438);
}

// Execute the main function and handle any errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});