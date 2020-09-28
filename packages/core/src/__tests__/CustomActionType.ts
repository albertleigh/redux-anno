import {createState, State} from '../state';
import {Action} from '../action';
import {Model} from '../model';
import {MODEL_TYPE, SAGA_TYPE} from '../base';
import {Saga} from '../saga';
import {putResolve} from 'redux-saga/effects';
import {initReduxAnno} from '../store';
import {getContext} from '../AnnoContext';

const OneCustomActionType = 'oneCustomActionType';

@Model(MODEL_TYPE.SINGLETON)
class CustomActionTypeModel {
  @State statNum = createState<number>(0);
  @State statStr = createState<string>();

  @Saga(SAGA_TYPE.TAKE_EVERY, OneCustomActionType)
  *customSaga(act: Action<number>) {
    const nextState = act.payload;
    if (Number.isInteger(nextState)) {
      yield putResolve(this.statNum.create(nextState!));
      yield putResolve(this.statStr.create(`StatStr ${nextState}`));
    }
  }
}

describe('ModelWithSagas', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: CustomActionTypeModel,
    });
  });

  it('autorun saga', () => {
    const defaultCtx = getContext();
    const oneCustomActTypIns = defaultCtx.getOneInstance(CustomActionTypeModel);

    expect(oneCustomActTypIns.statNum.value).toBe(0);
    expect(oneCustomActTypIns.statStr.value).toBe(undefined);

    defaultCtx.store.dispatch({
      type: OneCustomActionType,
      payload: 1,
    });

    expect(oneCustomActTypIns.statNum.value).toBe(1);
    expect(oneCustomActTypIns.statStr.value).toBe('StatStr 1');

    oneCustomActTypIns.customSaga.dispatch({
      type: 'whatever',
      payload: 2,
    });

    expect(oneCustomActTypIns.statNum.value).toBe(2);
    expect(oneCustomActTypIns.statStr.value).toBe('StatStr 2');
  });
});
