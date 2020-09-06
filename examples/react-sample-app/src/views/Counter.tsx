import React, {useCallback, useMemo} from 'react';
import {useSelector} from 'react-redux';
import {getContext} from 'redux-anno';

import CounterModel from '../stores/Counter';

const CounterComp = React.memo(() => {
  // todo move to hook utils

  const defaultCtx = useMemo(getContext, []);

  const counterInst = useMemo(() => defaultCtx.getOneInstance(CounterModel), [defaultCtx]);

  const counterVal = useSelector(() => counterInst.count);

  const updateCounterVal = useCallback(
    (nextVal: number) => () => {
      counterInst.updateCount.dispatch(nextVal);
    },
    [counterInst]
  );

  return (
    <div>
      Global Counter {counterVal}
      <button onClick={updateCounterVal(counterVal + 1)}>UP</button>
      <button onClick={updateCounterVal(counterVal - 1)}>DOWN</button>
    </div>
  );
});

export default CounterComp;
