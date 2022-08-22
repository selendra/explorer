import { AccountManager } from '../../managers';
import DefaultEvent from './DefaultEvent';

class KillAccountEvent extends DefaultEvent {
  async process(accountsManager: AccountManager): Promise<void> {
    // Process default event
    await super.process(accountsManager);
    const address = this.head.event.event.data[0].toString();
    // Kill account
    await accountsManager.use(address, false);
  }
}

export default KillAccountEvent;
