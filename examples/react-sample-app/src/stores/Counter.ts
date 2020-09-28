import {Model, State, Saga, createState} from 'redux-anno';

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

export default Counter;
