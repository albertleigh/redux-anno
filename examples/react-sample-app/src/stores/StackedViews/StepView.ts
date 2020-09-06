import {Model, MODEL_TYPE, Self, createSelf, State, createState, Saga} from 'redux-anno';
import {put} from 'redux-saga/effects';
import {BaseView, VIEW_TYPE} from './BaseView';

@Model(MODEL_TYPE.PROTOTYPE)
export class StepView extends BaseView {
  type = VIEW_TYPE.STEP_VIEW;

  @State stepMsg = createState<string>('');
  @State step = createState<number>(-1);
  @State stepCounter = createState<number>(-1);

  @Self self = createSelf(StepView);

  constructor(title: string, private initStep: number) {
    super(title);
  }

  *onPostEnter() {
    yield put(this.self.stepMsg.create(`StepView Msg: ${this.title}`));
    yield put(this.self.step.create(this.initStep));
    yield put(this.self.stepCounter.create(this.initStep));
    return;
  }

  *onPreLeave() {
    console.log('[StepView::onPreLeave]', this.title, this.step);
    return;
  }

  @Saga()
  *updateStepCounter(nextCounter: number) {
    yield put(this.self.stepCounter.create(nextCounter));
  }
}
