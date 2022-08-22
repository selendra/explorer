import DefaultEvent from './DefaultEvent';
import EndowedEvent from './EndowedEvent';
import ReservedEvent from './ReservedEvent';
import StakingEvent from './StakingEvent';
import ClaimEvmAccountEvent from './ClaimEvmAccountEvent';
import KillAccountEvent from './KillAccountEvent';
import { NativeTransferEvent } from './transfer';
import { EventData } from '../../../types';

const resolveEvent = async (head: EventData): Promise<DefaultEvent> => {
  // Compressing event section and method
  const eventCompression = `${head.event.event.section.toString()}.${head.event.event.method.toString()}`;

  // Decoding native events
  switch (eventCompression) {
    case 'evmAccounts.ClaimAccount': return new ClaimEvmAccountEvent(head);
    case 'balances.Endowed': return new EndowedEvent(head);
    case 'balances.Reserved': return new ReservedEvent(head);
    case 'balances.Transfer': return new NativeTransferEvent(head);
    case 'staking.Rewarded': return new StakingEvent(head);
    case 'system.KilledAccount': return new KillAccountEvent(head);
    default: return new DefaultEvent(head);
  }
};

export default resolveEvent;
