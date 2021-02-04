import {ValueEventEmitter} from './utils/ValueEventEmitter';
import {HealthStatus} from './base';

export interface RepeaterOption {
  onUpStreamMessage(listener: (data: string) => void): void;
  postUpStreamMessage(data: string): void;
  unsubscribeUpstream?(listener: (data: string) => void): void;
  onDownStreamMessage(listener: (data: string) => void): void;
  postDownStreamMessage(data: string): void;
  unsubscribeDownstream?(listener: (data: string) => void): void;
  filterMessages?(data: string): boolean;
}

interface Repeater {
  health: ValueEventEmitter<HealthStatus>;
  close(): void;
}

export function createRepeater(option: RepeaterOption): Repeater {
  const {
    onUpStreamMessage,
    postUpStreamMessage,
    unsubscribeUpstream,
    onDownStreamMessage,
    postDownStreamMessage,
    unsubscribeDownstream,
    filterMessages,
  } = option;

  const upstreamListener = (data: string) => {
    if (filterMessages && !filterMessages(data)) return;
    postDownStreamMessage(data);
  };

  const downstreamListener = (data: string) => {
    if (filterMessages && !filterMessages(data)) return;
    postUpStreamMessage(data);
  };

  onUpStreamMessage(upstreamListener);
  onDownStreamMessage(downstreamListener);

  const result = {
    health: new ValueEventEmitter<HealthStatus>(HealthStatus.LIVE),
    close: () => {
      unsubscribeUpstream && unsubscribeUpstream(upstreamListener);
      unsubscribeDownstream && unsubscribeDownstream(downstreamListener);
      result.health.emit(HealthStatus.DEAD);
    },
  };

  return Object.freeze(result);
}
