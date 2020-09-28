import {putResolve} from 'redux-saga/effects';

import {STATE_KEYS_FIELD} from '../base';
import {Model, Self, createSelf} from '../model';
import {State, createState, ModelSates} from '../state';
import {Reducer, createReducer} from '../reducer';
import {Thunk} from '../thunk';
import {Saga} from '../saga';

import {getContext} from '../AnnoContext';

import {initReduxAnno} from '../store';

class GrandPaModel {
  grandPaStr: string = 'grandPaStr';
}

type _CalculatedPapaState = ModelSates<PapaModel>;
interface PapaState {
  parentNum: number;
  parentStr: string;
}
class PapaModel extends GrandPaModel {
  @State parentNum = createState<number>();
  @State parentStr = createState('str0' as string);

  @Self self = createSelf(PapaModel);
  @Self papaSelf = createSelf(PapaModel);

  @Reducer
  onePapaReducer = createReducer((previousState: PapaState, payload: number) => {
    return {
      ...previousState,
      parentNum: payload,
      parentStr: `str${payload}`,
    };
  });

  @Saga()
  *parentSaga(nextState: number) {
    yield putResolve(this.parentNum.create(nextState));
    yield putResolve(this.parentStr.create(`str${nextState}`));
    return 'Yoo~ parent~';
  }
}

interface ChildState {
  oneStateNum: number;
  oneStateStr: string;
}
@Model()
class ChildModel extends PapaModel {
  @State oneStateNum = createState<number>();
  @State oneStateStr = createState('str0' as string);

  nonStateNum: number;
  nonStateArr: Array<string>;

  @Self self = createSelf(ChildModel);
  @Self childSelf = createSelf(ChildModel);

  constructor() {
    super();
  }

  @Reducer
  oneChildReducer = createReducer((previousState: ChildState, payload: number) => {
    return {
      ...previousState,
      oneStateNum: payload,
      oneStateStr: `str${payload}`,
    };
  });

  @Saga()
  *oneSaga(nextState: number) {
    yield putResolve(this.oneStateNum.create(1));
    yield putResolve(this.oneStateStr.create('str1'));
    // yield putResolve(this.self.secondSaga.create());
    return 'Yoo~ one~';
  }

  @Saga()
  *secondSaga() {
    yield putResolve(this.oneStateNum.create(2));
    yield putResolve(this.oneStateStr.create('str2'));
    yield* this.parentSaga(2);
  }

  @Saga()
  *thirdSaga() {
    yield putResolve(this.oneChildReducer.create(3));
    yield putResolve(this.onePapaReducer.create(3));
  }

  @Saga()
  *fourthSaga() {
    const curCount = this.oneStateNum.value + 1;
    yield putResolve(this.childSelf.oneThunk.create(curCount));
  }

  @Thunk()
  async oneThunk(nextState: number) {
    await Promise.all([this.oneChildReducer.dispatch(nextState), this.onePapaReducer.dispatch(nextState)]);
    return 'hi~ thunk one~';
  }
}

describe('InheritingModel', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: ChildModel,
      contexts: {
        subStore1: {
          entryModel: ChildModel,
        },
      },
    });
  });

  it('Inheriting 01', async () => {
    const defaultCtx = getContext();
    const subCtx1 = getContext('subStore1');

    expect((GrandPaModel as any)[STATE_KEYS_FIELD]).toBeFalsy();
    expect((PapaModel as any)[STATE_KEYS_FIELD]).toBeTruthy();
    expect((PapaModel as any)[STATE_KEYS_FIELD].size).toBe(2);
    expect((ChildModel as any)[STATE_KEYS_FIELD]).toBeTruthy();
    expect((ChildModel as any)[STATE_KEYS_FIELD].size).toBe(4);

    const someInst = defaultCtx.getOneInstance(ChildModel);

    expect(someInst.oneStateNum.value).toBe(undefined);
    expect(someInst.oneStateStr.value).toBe('str0');
    expect(someInst.grandPaStr).toBe('grandPaStr');

    await someInst.oneSaga.dispatch(1);

    expect(someInst.oneStateNum.value).toBe(1);
    expect(someInst.oneStateStr.value).toBe('str1');

    //-----------------------------------------------------------------------------------------

    await someInst.parentSaga.dispatch(3);
    expect(someInst.parentNum.value).toBe(3);
    expect(someInst.parentStr.value).toBe('str3');

    //-----------------------------------------------------------------------------------------

    const someSubInst = subCtx1.getOneInstance(ChildModel);

    expect(someSubInst.oneStateNum.value).toBe(undefined);
    expect(someSubInst.oneStateStr.value).toBe('str0');

    await someSubInst.secondSaga.dispatch();

    expect(someSubInst.oneStateNum.value).toBe(2);
    expect(someSubInst.oneStateStr.value).toBe('str2');
    expect(someSubInst.parentNum.value).toBe(2);
    expect(someSubInst.parentStr.value).toBe('str2');

    //-----------------------------------------------------------------------------------------

    await someSubInst.thirdSaga.dispatch();

    expect(someSubInst.oneStateNum.value).toBe(3);
    expect(someSubInst.oneStateStr.value).toBe('str3');
    expect(someSubInst.parentNum.value).toBe(3);
    expect(someSubInst.parentStr.value).toBe('str3');

    //-----------------------------------------------------------------------------------------

    await someSubInst.fourthSaga.dispatch();

    expect(someSubInst.oneStateNum.value).toBe(4);
    expect(someSubInst.oneStateStr.value).toBe('str4');
    expect(someSubInst.parentNum.value).toBe(4);
    expect(someSubInst.parentStr.value).toBe('str4');

    await someSubInst.oneThunk.dispatch(5);
    expect(someSubInst.oneStateNum.value).toBe(5);
    expect(someSubInst.oneStateStr.value).toBe('str5');
  });
});
