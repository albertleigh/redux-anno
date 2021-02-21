import {createState, Model, MODEL_TYPE, Saga, State} from 'redux-anno';

import {putResolve} from 'redux-saga/effects';

@Model(MODEL_TYPE.SINGLETON, 'Counter')
export class Counter {
  @State
  count = createState(0 as number);

  @Saga()
  *updateCount(nextVal: number) {
    yield putResolve(this.count.create(nextVal));
  }
}

export default Counter;
