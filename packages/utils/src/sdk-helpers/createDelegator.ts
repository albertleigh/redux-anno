import {
  getContext,
  REDUCER_KEYS_FIELD,
  SAGA_KEYS_FIELD,
  STATE_KEYS_FIELD,
  THUNK_KEYS_FIELD,
  WATCHED_KEYS_FIELD,
} from 'redux-anno';

import {
  DelegatorOption,
  deserializeMessage,
  HealthStatus,
  InitMessage,
  MessageListener,
  serializeMessage,
  ThenableHandler,
  TriggerMessage,
  UNDEFINED_SYMBOL,
} from './base';
import {ValueEventEmitter} from './utils/ValueEventEmitter';
import IdGenerator from './utils/IdGenerator';

export interface Delegator {
  health: ValueEventEmitter<HealthStatus>;
  clientSeq: number;
  delegateSeq: number;
  close(): void;
  unsubscribe(): void;
  registerClient(clientName: string, onMessageListener: MessageListener): void;
  unregisterClient(clientName: string): void;
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

  const onMsgByClientId: Map<string, MessageListener> = new Map();

  const result: Delegator = {
    health: new ValueEventEmitter<HealthStatus>(HealthStatus.INIT),
    clientSeq: IdGenerator.nextId(),
    delegateSeq: -1,
  } as Delegator;

  let lastState: any = {};

  const delegateProtImpl = {
    ready: (msg: InitMessage, theListener: MessageListener) => {
      const lastStateSend: any = {};
      for (const field of fields) {
        const theValue = theInst[field].value;
        lastStateSend[field] = theValue === undefined || theValue === null ? UNDEFINED_SYMBOL : theValue;
        lastState[field] = theValue;
      }
      theListener(
        serializeMessage({
          channel: 'READY',
          sequence: msg.sequence,
          state: lastStateSend,
          methods: Array.from(dispatchableKeys),
          ...instBase,
        })
      );
    },
    update: () => {
      const sequence = IdGenerator.nextId();
      const partialState: any = {};
      const partialStateSent: any = {};
      let needToUpdate = false;
      for (const field of fields) {
        if (lastState[field] !== theInst[field].value) {
          const theValue = theInst[field].value;
          partialStateSent[field] = theValue === undefined || theValue === null ? UNDEFINED_SYMBOL : theValue;
          partialState[field] = theValue;
          needToUpdate = true;
        }
      }
      if (needToUpdate) {
        const theMsg = serializeMessage({
          channel: 'UPDATE',
          sequence,
          partialState: partialStateSent,
          ...instBase,
        });
        postMessage && postMessage(theMsg);
        for (const [_, theListener] of onMsgByClientId.entries()) {
          theListener(theMsg);
        }
        lastState = {
          ...lastState,
          ...partialState,
        };
      }
    },
    _return: (msg: TriggerMessage, theListener: MessageListener) => {
      if (dispatchableKeys.has(msg.method)) {
        // call the promise and send the return result
        (async () => {
          try {
            const res = await theInst[msg.method].dispatch(msg.payload);
            theListener(
              serializeMessage({
                channel: 'RETURN',
                sequence: msg.sequence,
                result: res,
                ...instBase,
              })
            );
          } catch (e) {
            theListener(
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
      const theMsg = serializeMessage({
        channel: 'CLOSE',
        sequence,
        ...instBase,
      });
      postMessage && postMessage(theMsg);
      for (const [_, theListener] of onMsgByClientId.entries()) {
        theListener(theMsg);
      }
      return res;
    },
    disconnected: (clientId: string, theListener: MessageListener) => {
      const sequence = IdGenerator.nextId();
      result.clientSeq = sequence;
      unregisterClient(clientId);
      theListener(
        serializeMessage({
          channel: 'DISCONNECTED',
          sequence,
          ...instBase,
        })
      );
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

  const registerClient = (clientName: string, onMessageListener: MessageListener) => {
    if (!onMsgByClientId.has(clientName)) {
      onMsgByClientId.set(clientName, onMessageListener);
    }
  };

  const unregisterClient = (clientName: string) => {
    if (onMsgByClientId.has(clientName)) {
      onMsgByClientId.delete(clientName);
    }
  };

  const listener = (data: string, clientId: string) => {
    const msg = deserializeMessage(data, instBase);
    if (!!msg && !!clientId && onMsgByClientId.has(clientId)) {
      const theListener = onMsgByClientId.get(clientId)!;
      switch (msg.channel) {
        case 'INIT':
          delegateProtImpl.ready(msg, theListener);
          if (result.health.value === HealthStatus.INIT) {
            result.health.emit(HealthStatus.LIVE);
          }
          break;
        case 'ACK':
          break;
        case 'TRIGGER':
          delegateProtImpl._return(msg, theListener);
          break;
        case 'DISCONNECT':
          delegateProtImpl.disconnected(clientId, theListener);
          break;
        case 'FIN':
          unregisterClient(clientId);
          if (!onMsgByClientId.size) {
            result.health.emit(HealthStatus.DEAD);
            unsubscribe && unsubscribe(listener);
          }
          break;
        default:
          break;
      }
      result.clientSeq = msg.sequence;
    }
  };

  onMessage(listener);
  result.close = delegateProtImpl.close;
  result.registerClient = registerClient;
  result.unregisterClient = unregisterClient;
  result.unsubscribe = () => {
    unsubscribe && unsubscribe(listener);
  };
  return result;
}
