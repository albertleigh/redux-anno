<h1 align="center">Redux Anno</h1>

<div align="center">
A middleware leverages certain boilerplate while using redux

[![npm version](https://img.shields.io/npm/v/redux-anno.svg)](https://www.npmjs.com/package/redux-anno)
[![Build Status](https://travis-ci.com/albertleigh/redux-anno.svg?branch=master)](https://travis-ci.com/albertleigh/redux-anno)
[![Coverage Status](https://coveralls.io/repos/github/albertleigh/redux-anno/badge.svg)](https://coveralls.io/github/albertleigh/redux-anno)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
</div>

> *This is a very early release of this package, do not suggest using it in production till latter stable version*

I am a good old fan of spring core context DI and redux-anno is my first try to set up something similar in the Redux World.

A Simple Counter Example showing what I am trying to do
```typescript
import {Model, State, Saga, createState, initReduxAnno, getContext} from 'redux-anno';

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
``` 

For more info and details, please check the sample application `examples/react-sample-app` for now;

More detailed docs are incoming~
