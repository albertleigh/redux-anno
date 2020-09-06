import {putResolve} from 'redux-saga/effects';

import {STATE_KEYS_FIELD} from '../base';
import {Model, Self, createSelf} from '../model';
import {State, createState, ModelSates} from '../state';
import {Reducer} from '../reducer';
import {Thunk} from '../thunk';
import {Saga} from '../saga';

import {getContext} from '../AnnoContext';

import {initReduxAnno} from '../store';

class GrandPaModel {
  grandPaStr: string = 'grandPaStr';
}

class PapaModel extends GrandPaModel {
  @State parentNum = createState<number>();
  @State parentStr = createState('str0' as string);

  @Self self = createSelf(PapaModel);
  @Self papaSelf = createSelf(PapaModel);

  @Reducer<PapaModel>()
  onePapaReducer(previousState: ModelSates<PapaModel>, payload: number) {
    return {
      ...previousState,
      parentNum: payload,
      parentStr: `str${payload}`,
    };
  }

  @Saga()
  *parentSaga(nextState: number) {
    yield putResolve(this.papaSelf.parentNum.create(nextState));
    yield putResolve(this.self.parentStr.create(`str${nextState}`));
    return 'Yoo~ parent~';
  }
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

  @Reducer<ChildModel>()
  oneChildReducer(previousState: ModelSates<ChildModel>, payload: number) {
    return {
      ...previousState,
      oneStateNum: payload,
      oneStateStr: `str${payload}`,
    };
  }

  @Saga()
  *oneSaga(nextState: number) {
    yield putResolve(this.self.oneStateNum.create(1));
    yield putResolve(this.childSelf.oneStateStr.create('str1'));
    // yield putResolve(this.self.secondSaga.create());
    return 'Yoo~ one~';
  }

  @Saga()
  *secondSaga() {
    yield putResolve(this.childSelf.oneStateNum.create(2));
    yield putResolve(this.self.oneStateStr.create('str2'));
    yield* this.parentSaga(2);
  }

  @Saga()
  *thirdSaga() {
    yield putResolve(this.childSelf.oneChildReducer.create(3));
    yield putResolve(this.childSelf.onePapaReducer.create(3));
  }

  @Saga()
  *fourthSaga() {
    const curCount = this.self.oneStateNum.value + 1;
    yield putResolve(this.childSelf.oneThunk.create(curCount));
  }

  @Thunk()
  async oneThunk(nextState: number) {
    await Promise.all([
      this.childSelf.oneChildReducer.dispatch(nextState),
      this.childSelf.onePapaReducer.dispatch(nextState),
    ]);
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

    expect(someInst.oneStateNum).toBe(undefined);
    expect(someInst.oneStateStr).toBe('str0');
    expect(someInst.grandPaStr).toBe('grandPaStr');

    await someInst.oneSaga.dispatch(1);

    expect(someInst.oneStateNum).toBe(1);
    expect(someInst.oneStateStr).toBe('str1');

    //-----------------------------------------------------------------------------------------

    await someInst.parentSaga.dispatch(3);
    expect(someInst.parentNum).toBe(3);
    expect(someInst.parentStr).toBe('str3');

    //-----------------------------------------------------------------------------------------

    const someSubInst = subCtx1.getOneInstance(ChildModel);

    expect(someSubInst.oneStateNum).toBe(undefined);
    expect(someSubInst.oneStateStr).toBe('str0');

    await someSubInst.secondSaga.dispatch();

    expect(someSubInst.oneStateNum).toBe(2);
    expect(someSubInst.oneStateStr).toBe('str2');
    expect(someSubInst.parentNum).toBe(2);
    expect(someSubInst.parentStr).toBe('str2');

    //-----------------------------------------------------------------------------------------

    await someSubInst.thirdSaga.dispatch();

    expect(someSubInst.oneStateNum).toBe(3);
    expect(someSubInst.oneStateStr).toBe('str3');
    expect(someSubInst.parentNum).toBe(3);
    expect(someSubInst.parentStr).toBe('str3');

    //-----------------------------------------------------------------------------------------

    await someSubInst.fourthSaga.dispatch();

    expect(someSubInst.oneStateNum).toBe(4);
    expect(someSubInst.oneStateStr).toBe('str4');
    expect(someSubInst.parentNum).toBe(4);
    expect(someSubInst.parentStr).toBe('str4');

    await someSubInst.oneThunk.dispatch(5);
    expect(someSubInst.oneStateNum).toBe(5);
    expect(someSubInst.oneStateStr).toBe('str5');
  });
});
