import {Model, State, Saga, createState, initReduxAnno, getContext} from '../';
import {deepCopyObject} from '../utils/objects';

import {putResolve} from 'redux-saga/effects';
import {ReduxAnnoStore} from '../store';

@Model()
export class Counter {
  @State
  count = createState(0);

  @Saga()
  *updateCount(nextVal: number) {
    yield putResolve(this.count.create(nextVal));
  }
}

describe('CounterModel', () => {
  let annoStore: ReduxAnnoStore;
  let subAnnoStore1: ReduxAnnoStore;

  beforeAll(() => {
    annoStore = initReduxAnno({
      entryModel: Counter,
      contexts: {
        subCtx1: {
          entryModel: Counter,
        },
      },
    });
    subAnnoStore1 = annoStore.contexts!.subCtx1;
  });

  it('counter 01', async () => {
    const defaultCtx = getContext();
    const counterInst = defaultCtx.getOneInstance(Counter);

    expect(counterInst.count.value).toBe(0);

    await counterInst.updateCount.dispatch(1);

    expect(counterInst.count.value).toBe(1);
  });

  it('counter 02 in sub-ctx', async () => {
    const subCtx1 = getContext('subCtx1');
    const curState = {} as any;
    deepCopyObject(curState, subCtx1.store.getState());

    expect(Object.entries(curState).length).toBeTruthy();

    curState.Counter.count = 10;

    subAnnoStore1.reload(curState);

    let counterInstance = subCtx1.getOneInstance(Counter);
    expect(counterInstance.count.value).toBe(10);
    await counterInstance.updateCount.dispatch(11);
    expect(counterInstance.count.value).toBe(11);

    subAnnoStore1.reload();
    counterInstance = subCtx1.getOneInstance(Counter);
    expect(counterInstance.count.value).toBe(11);
    await counterInstance.updateCount.dispatch(12);
    expect(counterInstance.count.value).toBe(12);

    subAnnoStore1.reload({});
    expect(() => {
      counterInstance = subCtx1.getOneInstance(Counter);
    }).toThrowError('Cannot find the instance of the path Counter');
  });
});
