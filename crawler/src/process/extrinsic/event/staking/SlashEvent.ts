import { queryv2 } from '../../../../utils/connector';
import logger from '../../../../utils/logger';
import AccountManager from '../../../managers/AccountManager';
import { ExtrinsicData } from '../../../../types';
import DefaultEvent from '../DefaultEvent';

class SlashEvent extends DefaultEvent {
  signer: string = '';

  amount: string = '0';

  async process(accountsManager: AccountManager): Promise<void> {
    await super.process(accountsManager);

    this.signer = this.head.event.event.data[0].toString();
    this.amount = this.head.event.event.data[1].toString();

    // Marking controller account
    await accountsManager.use(this.signer);

    logger.info(`Redirecting staking slash from: ${this.signer}`);

    // Marking destination account
    await accountsManager.use(this.signer);
  }

  async save(extrinsicData: ExtrinsicData): Promise<void> {
    // Saving default event
    await super.save(extrinsicData);

    // Saving processed staking
    logger.info('Inserting staking event');
    await queryv2(
      `INSERT INTO staking
        (event_id, signer, amount, type, timestamp)
      VALUES
        ($1, $2, $3, $4, $5)`,
      [this.id, this.signer, this.amount, 'Slash', this.head.timestamp],
    );
  }
}

export default SlashEvent;
