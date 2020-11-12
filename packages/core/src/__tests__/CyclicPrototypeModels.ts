import {Model} from '../model';
import {MODEL_TYPE} from '../base';
import {createState, State} from '../state';
import {initReduxAnno} from '../store';
import {Saga} from '../saga';
import {putResolve} from 'redux-saga/effects';
import {createInstance, Instance} from '../instanced';
import {getContext} from '../AnnoContext';

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

  @Instance proto01 = createInstance(ProtoModel01);

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

describe('CyclicPrototypeModels', () => {
  it('toposort  01', () => {
    initReduxAnno({
      entryModel: EntryModel,
    });

    const defaultCtx = getContext();

    const entry = defaultCtx.getOneInstance(EntryModel);
    expect(entry.proto01).toBeTruthy();
    expect(() => {
      entry.proto01.proto02;
    }).toThrowError('Cyclic dependency, node was:"ProtoModel02"');
  });
});
