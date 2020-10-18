import {
  Computed,
  createComputed,
  createState,
  getContext,
  initReduxAnno,
  Model,
  MODEL_TYPE,
  ReduxAnnoStore,
  Saga,
  State,
  instantiate,
  disband,
} from '../';
import {put} from 'redux-saga/effects';

jest.useFakeTimers();

@Model()
export class SimpleModelWithComputedFields {
  @State oneNumberField = createState(0);
  @State oneStringField = createState('str0');

  @Computed combinedField = createComputed(
    function (this) {
      return `${this.oneStringField.value}::${this.oneNumberField.value}`;
    },
    ['oneNumberField', 'oneStringField']
  );

  @Saga()
  *updateAll(nextNum: number) {
    yield put(this.oneStringField.create(`str${nextNum}`));
    yield put(this.oneNumberField.create(nextNum));
  }
}

@Model(MODEL_TYPE.PROTOTYPE)
export class DynModelWithListeners {
  @State oneNumberField = createState(0);
  @State oneStringField = createState('str0');

  @Saga()
  *updateAll(nextNumber: number) {
    yield put(this.oneNumberField.create(nextNumber));
    yield put(this.oneStringField.create(`str${nextNumber}`));
  }
}

describe('ModelWithComputedFields', () => {
  let annoStore: ReduxAnnoStore;

  beforeAll(() => {
    annoStore = initReduxAnno({
      entryModel: SimpleModelWithComputedFields,
    });
  });

  it('test 01', async () => {
    const defaultCtx = getContext();
    const simpleInst = defaultCtx.getOneInstance(SimpleModelWithComputedFields);

    expect(simpleInst.combinedField.value).toBe('str0::0');

    await simpleInst.oneNumberField.dispatch(2);
    jest.runAllTimers();
    expect(simpleInst.combinedField.value).toBe('str0::2');

    await simpleInst.oneStringField.dispatch('str2');
    jest.runAllTimers();
    expect(simpleInst.combinedField.value).toBe('str2::2');

    await simpleInst.updateAll.dispatch(3);
    jest.runAllTimers();
    expect(simpleInst.combinedField.value).toBe('str3::3');
  });

  it('listener test 01', async () => {
    const defaultCtx = getContext();
    const dynInst = instantiate(DynModelWithListeners);

    const listenerCb = jest.fn();
    let listenerCbCnt = 0;
    dynInst.reduxStoreSubscribe(listenerCb);

    expect(dynInst.oneNumberField.value).toBe(0);
    expect(dynInst.oneStringField.value).toBe('str0');
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);

    await dynInst.updateAll.dispatch(1);
    listenerCbCnt += 3;
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);

    defaultCtx.store.dispatch({
      type: 'dummyAction',
    });

    listenerCbCnt += 1;
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);

    disband(dynInst);

    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
    defaultCtx.store.dispatch({
      type: 'dummyActionAgain',
    });
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
  });

  it('listener test 02', async () => {
    const defaultCtx = getContext();
    const dynInst = instantiate(DynModelWithListeners);

    const listenerCb = jest.fn();
    const unsubscribeCb = jest.fn();
    let listenerCbCnt = 0;
    dynInst.reduxStoreSubscribe(listenerCb, unsubscribeCb);

    expect(dynInst.oneNumberField.value).toBe(0);
    expect(dynInst.oneStringField.value).toBe('str0');
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
    expect(unsubscribeCb).not.toHaveBeenCalled();

    await dynInst.updateAll.dispatch(1);
    listenerCbCnt += 3;
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
    expect(unsubscribeCb).not.toHaveBeenCalled();

    defaultCtx.store.dispatch({
      type: 'dummyActionAgain',
    });

    listenerCbCnt += 1;
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
    expect(unsubscribeCb).not.toHaveBeenCalled();

    disband(dynInst);

    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
    expect(unsubscribeCb).toHaveBeenCalledTimes(1);

    defaultCtx.store.dispatch({
      type: 'dummyActionAgain',
    });
    expect(listenerCb).toHaveBeenCalledTimes(listenerCbCnt);
    expect(unsubscribeCb).toHaveBeenCalledTimes(1);
  });
});
