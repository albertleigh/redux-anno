import {apply, delay, put, take} from 'redux-saga/effects';
import {
  createState,
  getContext,
  initReduxAnno,
  instantiate,
  Model,
  Saga,
  Self,
  createSelf,
  SAGA_TYPE,
  Thunk,
  State,
  disband,
} from '../';

@Model()
class BasicModel {
  constructor(private cb: (str: string) => any) {}

  @Saga()
  *helloSaga(someStr: string) {
    yield delay(100);
    this.cb(someStr);
  }
}

@Model()
class CompositeModel {
  @State
  name = createState('');
  @State
  age = createState(0);

  @Saga()
  *updateAll() {
    yield put(this.name.create('basic name'));
    yield put(this.age.create(1));
  }

  *oneTimeCustomUpdateAll() {
    yield put(this.name.create('custom name'));
    yield put(this.age.create(this.age.value + 1));
  }

  @Saga(SAGA_TYPE.AUTO_RUN)
  *entrySagaIfNeeded() {
    const customAction = yield take('CompositeModel_oneTimeCustomUpdateAll');
    yield* this.oneTimeCustomUpdateAll.apply(this);
  }

  @Saga(SAGA_TYPE.TAKE_LATEST)
  *takeLatestUpdateAll() {
    yield put(this.name.create('latest name'));
    yield put(this.age.create(this.age.value + 2));
  }
}

@Model()
class HybridModel {
  constructor(private cb: (str: string) => any) {}

  // trigger thunk task from a saga task

  async thunkTaskV1(str: string): Promise<string> {
    return new Promise((res) => {
      this.cb(str);
      res('thunk task v1 cleared');
    });
  }

  @Saga()
  *sagaTaskV1(str: string) {
    return yield apply(this, this.thunkTaskV1, [str]);
  }

  // trigger saga task from a thunk task

  @Self self = createSelf(HybridModel);

  @Saga()
  *sagaTaskV2(str: string) {
    this.cb(str);
    return 'saga task v2 cleared';
  }

  @Thunk()
  async thunkTaskV2(str: string): Promise<string> {
    return this.self.sagaTaskV2.dispatch(str);
  }
}

@Model()
class UnregisteredModel {
  constructor(private cb: () => any) {}

  @Saga()
  *oneSagaTask() {
    this.cb();
  }
}

@Model()
class Entry {}

describe('Demo Saga', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: Entry,
    });
  });

  it('basic model', async () => {
    const someFun = jest.fn().mockImplementation((str: string) => {
      console.log(`[basic::someFun] boom shaka laka ${str} !`);
    });
    const basicInstance = instantiate(BasicModel, [someFun]);
    await basicInstance.helloSaga.dispatch('Hello Saga');
    expect(someFun).toHaveBeenCalled();
  });

  it('composite model', async () => {
    const defaultContext = getContext();
    const compositeInstance = instantiate(CompositeModel);
    expect(compositeInstance.age.value).toBe(0);
    expect(compositeInstance.name.value).toBe('');

    await compositeInstance.updateAll.dispatch();
    expect(compositeInstance.age.value).toBe(1);
    expect(compositeInstance.name.value).toBe('basic name');

    defaultContext.store.dispatch({
      type: 'CompositeModel_oneTimeCustomUpdateAll',
    });
    expect(compositeInstance.age.value).toBe(2);
    expect(compositeInstance.name.value).toBe('custom name');

    await compositeInstance.takeLatestUpdateAll.dispatch();
    expect(compositeInstance.age.value).toBe(4);
    expect(compositeInstance.name.value).toBe('latest name');

    await compositeInstance.takeLatestUpdateAll.dispatch();
    expect(compositeInstance.age.value).toBe(6);
    expect(compositeInstance.name.value).toBe('latest name');
  });

  it('hybrid model', async () => {
    const someFun = jest.fn().mockImplementation((str: string) => {
      console.log(`[hybrid::someFun] boom shaka laka ${str} !`);
    });
    const hybridInstance = instantiate(HybridModel, [someFun]);

    const res1 = await hybridInstance.sagaTaskV1.dispatch('call saga v1');
    expect(someFun).toBeCalledWith('call saga v1');
    expect(res1).toMatchSnapshot('hybrid model sagaTaskV1 response');

    const res2 = await hybridInstance.thunkTaskV2.dispatch('call thunk v2');
    expect(someFun).toBeCalledWith('call thunk v2');
    expect(res2).toMatchSnapshot('hybrid model thunkTaskV2 response');
  });

  it('unregistered model', async () => {
    const defaultContext = getContext();

    const someFun = jest.fn().mockImplementation(() => {
      console.log(`[unregistered::someFun] boom shaka laka !`);
    });
    expect(someFun).toHaveBeenCalledTimes(0);

    let unregisteredInstance = instantiate(UnregisteredModel, [someFun]);
    const oneSagaTaskActionType = unregisteredInstance.oneSagaTask.type;

    await unregisteredInstance.oneSagaTask.dispatch();
    expect(someFun).toHaveBeenCalledTimes(1);

    defaultContext.store.dispatch({type: oneSagaTaskActionType});
    expect(someFun).toHaveBeenCalledTimes(2);

    disband(unregisteredInstance);
    expect(() => {
      defaultContext.store.dispatch({type: oneSagaTaskActionType});
    }).toThrowError('Cannot find the instance of the path UnregisteredModel');
    expect(someFun).toHaveBeenCalledTimes(2);

    unregisteredInstance = instantiate(UnregisteredModel, [someFun]);
    expect(unregisteredInstance).toBeTruthy();
    defaultContext.store.dispatch({type: oneSagaTaskActionType});
    expect(someFun).toHaveBeenCalledTimes(3);
  });
});
