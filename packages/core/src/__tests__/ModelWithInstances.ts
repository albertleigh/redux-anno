import {putResolve} from 'redux-saga/effects';

import {MODEL_TYPE} from '../base';
import {createSelf, Model, Self} from '../model';
import {createState, State} from '../state';
import {initReduxAnno} from '../store';
import {createInstance, Instance} from '../instanced';
import {Saga} from '../saga';
import {getContext} from '../AnnoContext';

@Model(MODEL_TYPE.PROTOTYPE)
class PrototypeChildModel {
  @State protoNum = createState(0);
  @State protoStr = createState<string>();

  @Self self = createSelf(PrototypeChildModel);

  @Saga()
  *setProtoChildFields(nextState: number) {
    yield putResolve(this.protoNum.create(nextState));
    yield putResolve(this.protoStr.create(`ProtoStr ${nextState}`));
    return 'got proto child updated';
  }
}

@Model(MODEL_TYPE.SINGLETON)
class StaticChildModel {
  @State statNum = createState(0);
  @State statStr = createState<string>();

  constructor(private argNum: number) {}

  @Self self = createSelf(StaticChildModel);

  @Saga()
  *setStateChildFields(nextState: number) {
    yield putResolve(this.statNum.create(nextState));
    yield putResolve(this.statStr.create(`StatStr ${nextState}`));
    return 'got static child updated';
  }
}

@Model()
class PapaModel {
  @State papaNum = createState(0);
  @State papaStr = createState<string>();

  @Instance staticChild = createInstance(StaticChildModel, [1]);
  @Instance dynamicChild = createInstance(PrototypeChildModel);

  @Self self = createSelf(PapaModel);

  @Saga()
  *setPapaFields(nextState: number) {
    yield putResolve(this.papaNum.create(nextState));
    yield putResolve(this.papaStr.create(`StatStr ${nextState}`));
    return 'got papa child updated';
  }
}

describe('ModelWithInstances', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: PapaModel,
    });
  });

  it('general Model', async () => {
    const defaultCtx = getContext();

    const papaInst = defaultCtx.getOneInstance(PapaModel);

    expect(papaInst.staticChild).toBeTruthy();
    expect(papaInst.dynamicChild).toBeTruthy();

    expect(papaInst.staticChild.statNum.value).toBe(0);
    expect(papaInst.staticChild.statStr.value).toBe(undefined);
    await papaInst.staticChild.setStateChildFields.dispatch(1);
    expect(papaInst.staticChild.statNum.value).toBe(1);
    expect(papaInst.staticChild.statStr.value).toBe('StatStr 1');

    expect(papaInst.dynamicChild.protoNum.value).toBe(0);
    expect(papaInst.dynamicChild.protoStr.value).toBe(undefined);
    await papaInst.dynamicChild.setProtoChildFields.dispatch(2);
    expect(papaInst.dynamicChild.protoNum.value).toBe(2);
    expect(papaInst.dynamicChild.protoStr.value).toBe('ProtoStr 2');
  });
});
