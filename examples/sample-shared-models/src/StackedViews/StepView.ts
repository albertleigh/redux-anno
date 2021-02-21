import {Model, MODEL_TYPE, State, createState, Saga} from 'redux-anno';
import {put} from 'redux-saga/effects';
import {BaseView, VIEW_TYPE} from './BaseView';

@Model(MODEL_TYPE.PROTOTYPE, 'StepView')
export class StepView extends BaseView {
  type = VIEW_TYPE.STEP_VIEW;

  @State stepMsg = createState<string>('');
  @State step = createState<number>(-1);
  @State stepCounter = createState<number>(-1);

  constructor(title: string, private initStep: number) {
    super(title);
  }

  *onPostEnter() {
    yield put(this.stepMsg.create(`StepView Msg: ${this.title}`));
    yield put(this.step.create(this.initStep));
    yield put(this.stepCounter.create(this.initStep));
    return;
  }

  *onPreLeave() {
    console.log('[StepView::onPreLeave]', this.title, this.step);
    return;
  }

  @Saga()
  *updateStepCounter(nextCounter: number) {
    yield put(this.stepCounter.create(nextCounter));
  }
}
