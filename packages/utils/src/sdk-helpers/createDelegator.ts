import {
  getContext,
  STATE_KEYS_FIELD,
  WATCHED_KEYS_FIELD,
  REDUCER_KEYS_FIELD,
  THUNK_KEYS_FIELD,
  SAGA_KEYS_FIELD,
} from 'redux-anno';

import {
  ClientDelegatorBaseOption,
  deserializeMessage,
  HealthStatus,
  InitMessage,
  serializeMessage,
  ThenableHandler,
  TriggerMessage,
} from './base';
import {ValueEventEmitter} from './utils/ValueEventEmitter';
import IdGenerator from './utils/IdGenerator';

export type DelegatorOption = ClientDelegatorBaseOption;

export interface Delegator {
  health: ValueEventEmitter<HealthStatus>;
  clientSeq: number;
  delegateSeq: number;
  close(): void;
  unsubscribe(): void;
}

export function createDelegator(option: DelegatorOption) {
  const {onMessage, postMessage, unsubscribe} = option;
  const thenableHandlers: Map<number, ThenableHandler> = new Map();
  const instBase = {
    contextName: option.contextName,
    modelName: option.modelName,
    modelKey: option.modelKey,
  };

  const theCtx = getContext(option.contextName);
  const theInst = theCtx.getOneInstance(option.modelName, option.modelKey);

  // todo: oops, need to fix the type of this constructor
  const stateKeys = (theInst.constructor as any)[STATE_KEYS_FIELD] as Set<string>;
  const watchedKeys = (theInst.constructor as any)[WATCHED_KEYS_FIELD] as Set<string>;
  const reducersKeys = (theInst.constructor as any)[REDUCER_KEYS_FIELD] as Set<string>;
  const thunkKeys = (theInst.constructor as any)[THUNK_KEYS_FIELD] as Set<string>;
  const sagaKeys = (theInst.constructor as any)[SAGA_KEYS_FIELD] as Map<string, unknown>;
  const fields: Set<string> = new Set();
  const dispatchableKeys: Set<string> = new Set();

  // populate fields
  for (const one of stateKeys) {
    fields.add(one);
  }
  for (const one of watchedKeys) {
    fields.add(one);
  }
  // populate dispatchableKeys
  for (const one of reducersKeys) {
    dispatchableKeys.add(one);
  }
  for (const one of thunkKeys) {
    dispatchableKeys.add(one);
  }
  for (const [one] of sagaKeys) {
    dispatchableKeys.add(one);
  }

  const result: Delegator = {
    health: new ValueEventEmitter<HealthStatus>(HealthStatus.INIT),
    clientSeq: IdGenerator.nextId(),
    delegateSeq: -1,
  } as Delegator;

  let lastState: any = {};

  const delegateProtImpl = {
    ready: (msg: InitMessage) => {
      for (const field of fields) {
        lastState[field] = theInst[field].value;
      }
      postMessage(
        serializeMessage({
          channel: 'READY',
          sequence: msg.sequence,
          state: lastState,
          methods: Array.from(dispatchableKeys),
          ...instBase,
        })
      );
    },
    update: () => {
      const sequence = IdGenerator.nextId();
      const partialState: any = {};
      let needToUpdate = false;
      for (const field of fields) {
        if (lastState[field] !== theInst[field].value) {
          partialState[field] = theInst[field].value;
          needToUpdate = true;
        }
      }
      if (needToUpdate) {
        postMessage(
          serializeMessage({
            channel: 'UPDATE',
            sequence,
            partialState,
            ...instBase,
          })
        );
        lastState = {
          ...lastState,
          ...partialState,
        };
      }
    },
    _return: (msg: TriggerMessage) => {
      if (dispatchableKeys.has(msg.method)) {
        // call the promise and send the return result
        (async () => {
          try {
            const res = await theInst[msg.method].dispatch(msg.payload);
            postMessage(
              serializeMessage({
                channel: 'RETURN',
                sequence: msg.sequence,
                result: res,
                ...instBase,
              })
            );
          } catch (e) {
            postMessage(
              serializeMessage({
                channel: 'RETURN',
                sequence: msg.sequence,
                error: e,
                ...instBase,
              })
            );
          }
        })();
      }
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
    fin: () => {
      const sequence = IdGenerator.nextId();
      result.clientSeq = sequence;
      postMessage(
        serializeMessage({
          channel: 'FIN',
          sequence,
          ...instBase,
        })
      );
      result.health.emit(HealthStatus.DEAD);
      unsubscribe && unsubscribe(listener);
    },
  };

  theInst.reduxStoreSubscribe(
    () => {
      // chk diff and update the state if needed and update
      // todo debouncing?
      delegateProtImpl.update();
    },
    () => {
      // close and update health
      delegateProtImpl.close();
    }
  );

  const listener = (data: string) => {
    const msg = deserializeMessage(data, instBase);
    if (!!msg) {
      switch (msg.channel) {
        case 'INIT':
          delegateProtImpl.ready(msg);
          result.health.emit(HealthStatus.LIVE);
          break;
        case 'ACK':
          break;
        case 'TRIGGER':
          delegateProtImpl._return(msg);
          break;
        case 'CLOSE':
          delegateProtImpl.fin();
          break;
        case 'FIN':
          result.health.emit(HealthStatus.DEAD);
          unsubscribe && unsubscribe(listener);
          break;
        default:
          break;
      }
      result.clientSeq = msg.sequence;
    }
  };

  onMessage(listener);
  result.close = delegateProtImpl.close;
  result.unsubscribe = () => {
    unsubscribe && unsubscribe(listener);
  };
  return result;
}
