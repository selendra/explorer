import {
  insert,
  nodeProvider,
  logger,
  ensure,
  toChecksumAddress,
} from '../../../../utils';
import AccountManager from '../../../managers/AccountManager';
import { ExtrinsicData } from '../../../../types';
import DefaultEvent from './DefaultEvent';

class ContractCreateEvent extends DefaultEvent {
  skip = false;

  address?: string;

  maintainer?: string;

  static extistingContracts: Set<string> = new Set();

  private static preprocessBytecode(bytecode: string) {
    const start = bytecode.indexOf('6080604052');
    const end = bytecode.indexOf('a265627a7a72315820') !== -1
      ? bytecode.indexOf('a265627a7a72315820')
      : bytecode.indexOf('a264697066735822');
    return {
      context: bytecode.slice(start, end),
      args: bytecode.slice(end),
    };
  }

  async process(accountsManager: AccountManager): Promise<void> {
    await super.process(accountsManager);

    const address = this.head.event.event.data.length > 1
      // V9
      ? this.head.event.event.data[1]
      // V8
      : this.head.event.event.data[0];

    this.address = toChecksumAddress(address.toString());
    if (ContractCreateEvent.extistingContracts.has(this.address)) {
      this.skip = true;
      return;
    }
    ContractCreateEvent.extistingContracts.add(this.address);
    logger.info(`New contract created: \n\t -${this.address}`);

    const contractData: any = (await nodeProvider.query((provider) => provider.api.query.evm.accounts(this.address))).toJSON();
    this.maintainer = await accountsManager.useEvm(contractData.contractInfo.maintainer);
  }

  async save(extrinsicData: ExtrinsicData): Promise<void> {
    await super.save(extrinsicData);

    if (this.skip) { return; }

    ensure(!!this.address, 'Contract address was unclaimed. Call process function before save');
    ensure(!!this.maintainer, 'Contract maintainer was unclaimed. Call process function before save');

    const bytecode = extrinsicData.args[1].toString();

    const { context, args } = ContractCreateEvent.preprocessBytecode(bytecode);
    logger.info('Inserting contract');

    await insert(
      `
    INSERT INTO contract
      (address, extrinsic_id, signer, bytecode, bytecode_context, bytecode_arguments, public, timestamp)
    VALUES
      %L
    ON CONFLICT (address) DO NOTHING;`,
      [[this.address, extrinsicData.id, this.maintainer, bytecode, context, args, false, this.head.timestamp]],
    );
  }
}

export default ContractCreateEvent;
