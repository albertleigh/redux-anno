import {Model, State, Saga, Self, createSelf, createState} from 'redux-anno';

import {putResolve} from 'redux-saga/effects';

@Model()
export class Counter {
  @State
  count = createState(0 as number);

  @Self
  self = createSelf(Counter);

  @Saga()
  *updateCount(nextVal: number) {
    yield putResolve(this.self.count.create(nextVal));
  }
}

export default Counter;
