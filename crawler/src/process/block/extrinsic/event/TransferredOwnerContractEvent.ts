import {
  insertOne,
  nodeProvider,
  logger,
  toChecksumAddress,
} from '../../../../utils';
import AccountManager from '../../../managers/AccountManager';
import { ExtrinsicData } from '../../../../types';
import DefaultEvent from './DefaultEvent';

class TransferredOwnerContractEvent extends DefaultEvent {
  skip = false;

  address?: string;

  maintainer?: string;

  async process(accountsManager: AccountManager): Promise<void> {
    await super.process(accountsManager);

    const address = this.head.event.event.data[0];

    this.address = toChecksumAddress(address.toString());

    const contractData: any = (await nodeProvider.query((provider) => provider.api.query.evm.accounts(this.address))).toJSON();
    const maintainer = await accountsManager.useEvm(contractData.contractInfo.maintainer);
    this.maintainer = maintainer !== '0x' ? maintainer : this.address;
  }

  async save(extrinsicData: ExtrinsicData): Promise<void> {
    await super.save(extrinsicData);

    if (this.skip) { return; }

    logger.info(`Transfer owner of contract to address: ${this.maintainer}`);

    await insertOne(
      `UPDATE contract SET owner = '${this.maintainer}' WHERE address = '${this.address}';`,
    );
  }
}

export default TransferredOwnerContractEvent;
