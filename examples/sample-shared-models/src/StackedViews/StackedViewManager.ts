import {Model, MODEL_TYPE, InsTyp, AnyClass, Saga, Self, createSelf} from 'redux-anno';
import {putResolve} from 'redux-saga/effects';
import {BaseStackViewManager} from 'redux-anno-utils/lib/examples/StackViews/StackViewManager';
import {BaseView} from './BaseView';
import {WelcomeView} from './WelcomeView';
import {StepView} from './StepView';

@Model(MODEL_TYPE.SINGLETON)
export class StackedViewManager extends BaseStackViewManager<AnyClass<BaseView>> {
  *onPageAdded(_ins: InsTyp<AnyClass<BaseView>>): Generator<any, any, any> {
    console.log('[StackedViewManger::onPageAdded]', _ins);
    return;
  }

  *onPageRemoved(_ins: InsTyp<AnyClass<BaseView>>): Generator<any, any, any> {
    console.log('[StackedViewManger::onPageRemoved]', _ins);
    return;
  }

  @Self self = createSelf(StackedViewManager);

  @Saga()
  *addWelcomeView() {
    yield* this.navigateTo({
      model: WelcomeView,
      args: [],
    });
    yield putResolve(this.current.create(this.length - 1));
  }

  @Saga()
  *addStepView(stepNum: number) {
    yield* this.navigateTo({
      model: StepView,
      args: [`Step ${stepNum}`, stepNum],
    });
    yield putResolve(this.current.create(this.length - 1));
  }
}
export default StackedViewManager;
