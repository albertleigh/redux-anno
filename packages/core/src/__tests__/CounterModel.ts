import {Model, State, Saga, createState, initReduxAnno, getContext} from '../';

import {putResolve} from 'redux-saga/effects';

@Model()
export class Counter {
  @State
  count = createState(0 as number);

  @Saga()
  *updateCount(nextVal: number) {
    yield putResolve(this.count.create(nextVal));
  }
}

describe('CounterModel', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: Counter,
    });
  });

  it('counter 01', async () => {
    const defaultCtx = getContext();
    const counterInst = defaultCtx.getOneInstance(Counter);

    expect(counterInst.count.value).toBe(0);

    await counterInst.updateCount.dispatch(1);

    expect(counterInst.count.value).toBe(1);
  });
});
