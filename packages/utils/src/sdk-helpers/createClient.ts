import {StateField} from 'redux-anno/lib/esm/state';
import {ComputedField} from 'redux-anno/lib/esm/computed';
import {ExtractReducerFieldPayload, IsAnnoReducerField} from 'redux-anno/lib/esm/reducer';
import {ExtractThunkFieldPayload, ExtractThunkFieldResult, ThunkField} from 'redux-anno/lib/esm/thunk';
import {ExtractSagaFieldPayload, ExtractSagaFieldResult, SagaField} from 'redux-anno/lib/esm/saga';

import {
  ClientOption,
  CloseMessage,
  deserializeMessage,
  HealthStatus,
  serializeMessage,
  ThenableHandler,
  UNDEFINED_SYMBOL,
  UpdateMessage,
} from './base';

import IdGenerator from './utils/IdGenerator';
import {ValueEventEmitter} from './utils/ValueEventEmitter';

export interface Client<T> {
  health: ValueEventEmitter<HealthStatus>;
  clientSeq: number;
  delegateSeq: number;
  // states, thunk, saga, computed, reducers
  instance: {
    [P in keyof T]: T[P] extends StateField<infer S>
      ? ValueEventEmitter<S>
      : T[P] extends ThunkField
      ? NonNullable<ExtractThunkFieldPayload<T[P]>> extends never
        ? () => Promise<ExtractThunkFieldResult<T[P]>>
        : ExtractThunkFieldPayload<T[P]> & undefined extends never
        ? (payload: ExtractThunkFieldPayload<T[P]>) => Promise<ExtractThunkFieldResult<T[P]>>
        : (payload?: NonNullable<ExtractThunkFieldPayload<T[P]>>) => Promise<ExtractThunkFieldResult<T[P]>>
      : T[P] extends SagaField
      ? NonNullable<ExtractSagaFieldPayload<T[P]>> extends never
        ? () => Promise<ExtractSagaFieldResult<T[P]>>
        : ExtractSagaFieldPayload<T[P]> & undefined extends never
        ? (payload: ExtractSagaFieldPayload<T[P]>) => Promise<ExtractSagaFieldResult<T[P]>>
        : (payload?: NonNullable<ExtractSagaFieldPayload<T[P]>>) => Promise<ExtractSagaFieldResult<T[P]>>
      : T[P] extends ComputedField<infer C>
      ? ValueEventEmitter<C>
      : T[P] extends IsAnnoReducerField
      ? NonNullable<ExtractReducerFieldPayload<T[P]>> extends undefined
        ? () => Promise<void>
        : ExtractReducerFieldPayload<T[P]> & undefined extends never
        ? (payload: ExtractReducerFieldPayload<T[P]>) => Promise<void>
        : (payload?: NonNullable<ExtractReducerFieldPayload<T[P]>>) => Promise<void>
      : unknown;
  };
  disconnect(): void;
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
    disconnect: () => {
      const sequence = IdGenerator.nextId();
      result.clientSeq = sequence;
      const res = new Promise((resolve, reject) => {
        thenableHandlers.set(sequence, {resolve, reject});
      });
      postMessage(
        serializeMessage({
          channel: 'DISCONNECT',
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
          // populate all event emitters only for init
          if (result.health.value === HealthStatus.INIT) {
            Object.keys(msg.state).forEach((field) => {
              const value = msg.state[field];
              (result.instance as any)[field] =
                value === UNDEFINED_SYMBOL ? new ValueEventEmitter<any>(undefined) : new ValueEventEmitter<any>(value);
            });
            for (const method of msg.methods) {
              (result.instance as any)[method] = (payload?: any) => {
                return clientProtImpl.trigger(method, payload);
              };
            }
            result.health.emit(HealthStatus.LIVE);
          }
          break;
        case 'UPDATE':
          // partial populate all those event emitters
          Object.keys(msg.partialState).forEach((field) => {
            if (field in result.instance) {
              const rawValue = msg.partialState[field];
              const nextValue = rawValue === UNDEFINED_SYMBOL ? undefined : rawValue;
              (result.instance as any)[field].emit(nextValue);
            }
          });
          clientProtImpl.ack(msg);
          break;
        case 'RETURN':
          // todo might need to consider it again
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
        case 'DISCONNECTED':
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

  result.disconnect = clientProtImpl.disconnect;
  result.unsubscribe = () => {
    unsubscribe && unsubscribe(listener);
  };
  return result;
}
