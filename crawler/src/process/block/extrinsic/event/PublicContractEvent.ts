import { insertOne, toChecksumAddress, logger } from '../../../../utils';
import { ExtrinsicData } from '../../../../types';
import DefaultEvent from './DefaultEvent';

class PublicContractEvent extends DefaultEvent {
  skip = false;

  address?: string;

  async save(extrinsicData: ExtrinsicData): Promise<void> {
    await super.save(extrinsicData);

    if (this.skip) { return; }

    const address = this.head.event.event.data.length > 1 ? this.head.event.event.data[1] : this.head.event.event.data[0];
    this.address = toChecksumAddress(address.toString());

    const publicCoinract: boolean = true;

    logger.info(`Publish contract with address: ${this.address}`);

    await insertOne(
      `UPDATE contract SET public = '${publicCoinract}' WHERE address = '${this.address}';`,
    );
  }
}

export default PublicContractEvent;
