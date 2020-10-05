import {createSelf, Model, Self} from '../model';
import {MODEL_TYPE, SAGA_TYPE} from '../base';
import {createState, State} from '../state';
import {Saga} from '../saga';
import {putResolve} from 'redux-saga/effects';
import {initReduxAnno} from '../store';
import {getContext} from '../AnnoContext';

@Model(MODEL_TYPE.SINGLETON)
class OneStaticModel {
  @State statNum = createState(0);
  @State statStr = createState('');

  constructor(private argNum: number) {}

  @Self self = createSelf(OneStaticModel);

  @Saga()
  *setStateChildFields(nextState: number) {
    yield putResolve(this.statNum.create(nextState));
    yield putResolve(this.statStr.create(`StatStr ${nextState}`));
    return 'got static child updated';
  }

  @Saga(SAGA_TYPE.AUTO_RUN)
  *entrySaga() {
    yield* this.setStateChildFields(1);
  }
}

describe('ModelWithSagas', () => {
  beforeAll(() => {
    initReduxAnno({
      entryModel: OneStaticModel,
    });
  });

  it('autorun saga', () => {
    const defaultCtx = getContext();
    const oneStaticIns = defaultCtx.getOneInstance(OneStaticModel);
    expect(oneStaticIns.statNum.value).toBe(1);
    expect(oneStaticIns.statStr.value).toBe('StatStr 1');
  });
});
