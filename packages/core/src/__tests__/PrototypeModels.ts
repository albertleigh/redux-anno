import {
  MODEL_TYPE,
  Model,
  State,
  createState,
  getContext,
  disband,
  initReduxAnno,
  Instance,
  createInstance,
  Saga,
} from '../index';
import {putResolve} from 'redux-saga/effects';

@Model(MODEL_TYPE.PROTOTYPE)
class ProtoModel01 {
  @State proto01Num = createState(0);
  @State proto01Str = createState('');

  @Instance
  proto02 = createInstance(ProtoModel02);

  @Saga()
  *setProtoFields(nextState: number) {
    yield putResolve(this.proto01Num.create(nextState));
    yield putResolve(this.proto01Str.create(`ProtoStr ${nextState}`));
    return 'got proto 01 fields updated';
  }
}

@Model(MODEL_TYPE.PROTOTYPE)
class ProtoModel02 {
  @State proto02Num = createState(0);
  @State proto02Str = createState('');

  @Saga()
  *setProtoFields(nextState: number) {
    yield putResolve(this.proto02Num.create(nextState));
    yield putResolve(this.proto02Str.create(`ProtoStr ${nextState}`));
    return 'got proto 02 fields updated';
  }
}

@Model()
class EntryModel {
  @Instance proto01 = createInstance(ProtoModel01);
}

describe('PrototypeModels', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: EntryModel,
      contexts: {
        test01: {entryModel: EntryModel},
        test02: {entryModel: EntryModel},
      },
    });
  });

  it('proto models 01', () => {
    const defaultCtx = getContext('test01');
    const entry = defaultCtx.getOneInstance(EntryModel);
    expect(entry.proto01).toBeTruthy();
    const key01 = entry.proto01.modelKey;
    expect(entry.proto01.proto02).toBeTruthy();
    const key02 = entry.proto01.proto02.modelKey;

    disband(entry.proto01);

    const entryInst = defaultCtx.getOneInstance(EntryModel);
    expect(entryInst).toBeTruthy();

    expect(() => {
      defaultCtx.getOneInstance(ProtoModel01, key01);
    }).toThrowError('Cannot find the instance of the path ProtoModel01ÆÄ1');

    expect(() => {
      defaultCtx.getOneInstance(ProtoModel02, key02);
    }).toThrowError('Cannot find the instance of the path ProtoModel02ÆÄ2');
  });

  it('proto models 02', () => {
    const defaultCtx = getContext('test02');
    const entry = defaultCtx.getOneInstance(EntryModel);
    expect(entry.proto01).toBeTruthy();
    const key01 = entry.proto01.modelKey;
    expect(entry.proto01.proto02).toBeTruthy();
    const key02 = entry.proto01.proto02.modelKey;

    disband(entry.proto01, {disbandPrototypeChildrenCreatedByMe: false});

    const entryInst = defaultCtx.getOneInstance(EntryModel);
    expect(entryInst).toBeTruthy();

    expect(() => {
      defaultCtx.getOneInstance(ProtoModel01, key01);
    }).toThrowError('Cannot find the instance of the path ProtoModel01ÆÄ3');

    const proto2 = defaultCtx.getOneInstance(ProtoModel02, key02);
    expect(proto2).toBeTruthy();
  });
});
