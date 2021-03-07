import {
  initReduxAnno,
  ReduxAnnoStore,
  getContext,
  Model,
  Self,
  createSelf,
  State,
  createState,
  Computed,
  createComputed,
  Reducer,
  createReducer,
  Thunk,
  Saga,
} from 'redux-anno';
import {putResolve} from 'redux-saga/effects';

import {HealthStatus} from '../base';
import {createDelegator} from '../createDelegator';
import {createClient} from '../createClient';
import {createRepeater} from '../createRepeater';

@Model()
export class Counter {
  @State
  count = createState(0);

  @Self self = createSelf(Counter);

  // todo ding it, why it is not working for god sake
  @Computed tenTimesField = createComputed(
    function (this) {
      return this.count.value * 10;
    },
    ['count']
  );

  @Thunk()
  async double(nextVal: number): Promise<number> {
    return this.self.updateCount.dispatch(nextVal * 2);
  }

  @Reducer triple = createReducer((pre: any, payload: number) => {
    return {
      ...pre,
      count: payload * 3,
    };
  });

  @Saga()
  *updateCount(nextVal: number) {
    yield putResolve(this.count.create(nextVal));
    return nextVal;
  }
}

jest.useFakeTimers();

describe('DelegatorsAndClients', () => {
  let annoStore: ReduxAnnoStore;

  beforeAll(() => {
    annoStore = initReduxAnno({
      entryModel: Counter,
      contexts: {
        subCtx1: {
          entryModel: Counter,
        },
      },
    });
  });

  it('delegator close', async () => {
    const currentClientId = 'test01 delegator close';

    const defaultCtx = getContext();
    const counterInst = defaultCtx.getOneInstance(Counter);
    await counterInst.count.dispatch(0);

    const unsubscribe = jest.fn();

    let delegatedListener: (data: string, clientId: string) => void;
    let clientListener: (data: string) => void;
    const deleMsgs: string[] = [];
    const specificDeleMsgs: string[] = [];
    const cltMsgs: string[] = [];

    const delegator = createDelegator({
      contextName: counterInst.contextName,
      modelName: counterInst.modelName,
      modelKey: counterInst.modelKey,
      onMessage(listener: (data: string, client: string) => void) {
        delegatedListener = listener;
      },
      postMessage(data: string, clientId) {
        deleMsgs.push(data);
      },
      unsubscribe,
    });

    delegator.registerClient(currentClientId, (data) => {
      specificDeleMsgs.push(data);
      clientListener && clientListener(data);
    });

    expect(delegator.health.value).toBe(HealthStatus.INIT);

    const client = createClient<Counter>({
      contextName: counterInst.contextName,
      modelName: counterInst.modelName,
      modelKey: counterInst.modelKey,
      onMessage(listener: (data: string) => void) {
        clientListener = listener;
      },
      postMessage(data: string) {
        cltMsgs.push(data);
        delegatedListener && delegatedListener(data, currentClientId);
      },
      unsubscribe,
    });

    expect(delegator.health.value).toBe(HealthStatus.LIVE);
    expect(client.health.value).toBe(HealthStatus.LIVE);

    expect(client.instance.count.value).toBe(0);

    // saga
    let cltRes = await client.instance.updateCount(1);
    expect(cltRes).toBe(1);
    jest.runAllTimers();

    expect(counterInst.count.value).toBe(1);
    expect(counterInst.tenTimesField.value).toBe(10);
    expect(client.instance.count.value).toBe(1);
    expect(client.instance.tenTimesField.value).toBe(10);

    await counterInst.updateCount.dispatch(2);

    expect(counterInst.count.value).toBe(2);
    // expect(counterInst.tenTimesField.value).toBe(0);
    expect(client.instance.count.value).toBe(2);
    // expect(client.instance.tenTimesField.value).toBe(0);

    // thunk
    cltRes = await client.instance.double(3);
    expect(cltRes).toBe(6);
    expect(counterInst.count.value).toBe(6);
    expect(client.instance.count.value).toBe(6);
    await counterInst.double.dispatch(4);
    expect(counterInst.count.value).toBe(8);
    expect(client.instance.count.value).toBe(8);

    // reducer
    await client.instance.triple(3);
    expect(counterInst.count.value).toBe(9);
    expect(client.instance.count.value).toBe(9);
    await counterInst.triple.dispatch(4);
    expect(counterInst.count.value).toBe(12);
    expect(client.instance.count.value).toBe(12);

    jest.runAllTimers();

    // client.close();
    delegator.close();

    expect(delegator.health.value).toBe(HealthStatus.DEAD);
    expect(client.health.value).toBe(HealthStatus.DEAD);

    expect(unsubscribe).toHaveBeenCalledTimes(2);

    expect(deleMsgs.length).toBeLessThan(specificDeleMsgs.length);
    expect(deleMsgs.length).toBeLessThan(cltMsgs.length);
    expect(specificDeleMsgs.length).toEqual(cltMsgs.length);
  });

  it('client close w/ repeater', async () => {
    const currentClientId = 'test02 client close w/ repeater';

    const defaultCtx = getContext();
    const counterInst = defaultCtx.getOneInstance(Counter);
    await counterInst.count.dispatch(0);

    const unsubscribe = jest.fn();

    let delegatedListener: (data: string, clientId: string) => void;
    let clientListener: (data: string) => void;
    let repeaterUpListener: (data: string) => void;
    let repeaterDownListener: (data: string) => void;
    const deleMsgs: string[] = [];
    const specificDeleMsgs: string[] = [];
    const cltMsgs: string[] = [];
    const rpUpMsgs: string[] = [];
    const rpDownMsgs: string[] = [];

    const delegator = createDelegator({
      contextName: counterInst.contextName,
      modelName: counterInst.modelName,
      modelKey: counterInst.modelKey,
      onMessage(listener: (data: string, clientId: string) => void) {
        delegatedListener = listener;
      },
      postMessage(data: string) {
        deleMsgs.push(data);
      },
      unsubscribe,
    });

    delegator.registerClient(currentClientId, (data) => {
      specificDeleMsgs.push(data);
      repeaterUpListener && repeaterUpListener(data);
    });

    expect(delegator.health.value).toBe(HealthStatus.INIT);

    const repeater = createRepeater({
      postUpStreamMessage(data: string) {
        rpUpMsgs.push(data);
        delegatedListener && delegatedListener(data, currentClientId);
      },
      onUpStreamMessage(listener: (data: string) => void) {
        repeaterUpListener = listener;
      },
      postDownStreamMessage(data: string) {
        rpDownMsgs.push(data);
        clientListener && clientListener(data);
      },
      onDownStreamMessage(listener: (data: string) => void) {
        repeaterDownListener = listener;
      },
      filterMessages(data: string): boolean {
        return true;
      },
    });

    const client = createClient<Counter>({
      contextName: counterInst.contextName,
      modelName: counterInst.modelName,
      modelKey: counterInst.modelKey,
      onMessage(listener: (data: string) => void) {
        clientListener = listener;
      },
      postMessage(data: string) {
        cltMsgs.push(data);
        repeaterDownListener && repeaterDownListener(data);
      },
      unsubscribe,
    });

    expect(delegator.health.value).toBe(HealthStatus.LIVE);
    expect(client.health.value).toBe(HealthStatus.LIVE);

    expect(client.instance.count.value).toBe(0);

    // saga
    let cltRes = await client.instance.updateCount(1);
    expect(cltRes).toBe(1);
    jest.runAllTimers();

    expect(counterInst.count.value).toBe(1);
    expect(counterInst.tenTimesField.value).toBe(10);
    expect(client.instance.count.value).toBe(1);
    expect(client.instance.tenTimesField.value).toBe(10);

    await counterInst.updateCount.dispatch(2);

    expect(counterInst.count.value).toBe(2);
    // expect(counterInst.tenTimesField.value).toBe(0);
    expect(client.instance.count.value).toBe(2);
    // expect(client.instance.tenTimesField.value).toBe(0);

    // thunk
    cltRes = await client.instance.double(3);
    expect(cltRes).toBe(6);
    expect(counterInst.count.value).toBe(6);
    expect(client.instance.count.value).toBe(6);
    await counterInst.double.dispatch(4);
    expect(counterInst.count.value).toBe(8);
    expect(client.instance.count.value).toBe(8);

    // reducer
    await client.instance.triple(3);
    expect(counterInst.count.value).toBe(9);
    expect(client.instance.count.value).toBe(9);
    await counterInst.triple.dispatch(4);
    expect(counterInst.count.value).toBe(12);
    expect(client.instance.count.value).toBe(12);

    jest.runAllTimers();

    client.disconnect();
    // delegator.close();

    expect(delegator.health.value).toBe(HealthStatus.LIVE);
    expect(repeater.health.value).toBe(HealthStatus.LIVE);
    expect(client.health.value).toBe(HealthStatus.DEAD);

    repeater.close();

    expect(repeater.health.value).toBe(HealthStatus.DEAD);

    expect(unsubscribe).toHaveBeenCalledTimes(1);

    expect(deleMsgs.length).toBeLessThan(specificDeleMsgs.length);
    expect(deleMsgs.length).toBeLessThan(cltMsgs.length);
    expect(specificDeleMsgs.length).toEqual(cltMsgs.length);
    expect(rpUpMsgs.length).toEqual(rpDownMsgs.length);
  });
});
