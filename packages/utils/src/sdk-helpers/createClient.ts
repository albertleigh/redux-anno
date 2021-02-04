import {StateField} from 'redux-anno/lib/esm/state';
import {ComputedField} from 'redux-anno/lib/esm/computed';
import {IsAnnoReducerField, ExtractReducerFieldPayload} from 'redux-anno/lib/esm/reducer';
import {ThunkField, ExtractThunkFieldPayload, ExtractThunkFieldResult} from 'redux-anno/lib/esm/thunk';
import {SagaField, ExtractSagaFieldPayload, ExtractSagaFieldResult} from 'redux-anno/lib/esm/saga';

import {
  ClientDelegatorBaseOption,
  HealthStatus,
  serializeMessage,
  ThenableHandler,
  UpdateMessage,
  deserializeMessage,
  CloseMessage,
} from './base';

import IdGenerator from './utils/IdGenerator';
import {ValueEventEmitter} from './utils/ValueEventEmitter';

export type ClientOption = ClientDelegatorBaseOption;

export interface Client<T> {
  health: ValueEventEmitter<HealthStatus>;
  clientSeq: number;
  delegateSeq: number;
  // states, thunk, saga, computed, reducers
  instance: {
    [P in keyof T]: T[P] extends StateField<infer S>
      ? ValueEventEmitter<S>
      : T[P] extends ThunkField
      ? (payload: ExtractThunkFieldPayload<T[P]>) => Promise<ExtractThunkFieldResult<T[P]>>
      : T[P] extends SagaField
      ? (payload: ExtractSagaFieldPayload<T[P]>) => Promise<ExtractSagaFieldResult<T[P]>>
      : T[P] extends ComputedField<infer C>
      ? ValueEventEmitter<C>
      : T[P] extends IsAnnoReducerField
      ? (payload: ExtractReducerFieldPayload<T[P]>) => Promise<void>
      : unknown;
  };
  close(): void;
  unsubscribe(): void;
}

export function createClient<T>(option: ClientOption): Client<T> {
  const {onMessage, postMessage, unsubscribe} = option;
  const thenableHandlers: Map<number, ThenableHandler> = new Map();

  const instBase = {
    contextName: option.contextName,
    modelName: option.modelName,
    modelKey: option.modelKey,
  };

  const result: Client<T> = {
    health: new ValueEventEmitter<HealthStatus>(HealthStatus.INIT),
    clientSeq: IdGenerator.nextId(),
    delegateSeq: -1,
    instance: {},
  } as Client<T>;

  const clientProtImpl = {
    init: () => {
      const sequence = IdGenerator.nextId();
      result.clientSeq = sequence;
      // init corresponding delegate
      postMessage(
        serializeMessage({
          channel: 'INIT',
          sequence,
          ...instBase,
        })
      );
    },
    ack: (msg: UpdateMessage) => {
      postMessage(
        serializeMessage({
          channel: 'ACK',
          sequence: msg.sequence,
          ...instBase,
        })
      );
    },
    trigger: (method: string, payload: any) => {
      const sequence = IdGenerator.nextId();
      result.clientSeq = sequence;
      const res = new Promise((resolve, reject) => {
        thenableHandlers.set(sequence, {resolve, reject});
      });
      postMessage(
        serializeMessage({
          channel: 'TRIGGER',
          sequence,
          method,
          payload,
          ...instBase,
        })
      );
      return res;
    },
    close: () => {
      const sequence = IdGenerator.nextId();
      result.clientSeq = sequence;
      const res = new Promise((resolve, reject) => {
        thenableHandlers.set(sequence, {resolve, reject});
      });
      postMessage(
        serializeMessage({
          channel: 'CLOSE',
          sequence,
          ...instBase,
        })
      );
      return res;
    },
    fin: (msg: CloseMessage) => {
      postMessage(
        serializeMessage({
          channel: 'FIN',
          sequence: msg.sequence,
          ...instBase,
        })
      );
      result.health.emit(HealthStatus.DEAD);
      unsubscribe && unsubscribe(listener);
    },
  };

  const listener = (data: string) => {
    const msg = deserializeMessage(data, instBase);
    if (!!msg) {
      switch (msg.channel) {
        case 'READY':
          // populate all event emitters
          Object.keys(msg.state).forEach((field) => {
            (result.instance as any)[field] = new ValueEventEmitter<any>(msg.state[field]);
          });
          for (const method of msg.methods) {
            (result.instance as any)[method] = (payload?: any) => {
              return clientProtImpl.trigger(method, payload);
            };
          }
          result.health.emit(HealthStatus.LIVE);
          break;
        case 'UPDATE':
          // partial populate all those event emitters
          Object.keys(msg.partialState).forEach((field) => {
            if (field in result.instance) {
              (result.instance as any)[field].emit(msg.partialState[field]);
            }
          });
          clientProtImpl.ack(msg);
          break;
        case 'RETURN':
          if (thenableHandlers.has(msg.sequence)) {
            const {resolve, reject} = thenableHandlers.get(msg.sequence)!;
            if (!!msg.error) {
              reject(msg.error);
            } else {
              resolve(msg.result);
            }
          }
          break;
        case 'CLOSE':
          clientProtImpl.fin(msg);
          break;
        case 'FIN':
          result.health.emit(HealthStatus.DEAD);
          unsubscribe && unsubscribe(listener);
          break;
        default:
          break;
      }
      result.delegateSeq = msg.sequence;
    }
  };

  onMessage(listener);
  clientProtImpl.init();

  result.close = clientProtImpl.close;
  result.unsubscribe = () => {
    unsubscribe && unsubscribe(listener);
  };
  return result;
}
