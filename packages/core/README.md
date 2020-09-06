# Redux Anno

A middleware leverages certain boilerplate while using redux

> *This is a very early release of this package, do not suggest using it in production till latter stable version*

I am a good old fan of spring core context DI and redux-anno is my first try to set up something similar in the Redux World.

A Simple Counter Example showing what I am trying to do
```typescript
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

``` 
