import {createState, Model, MODEL_TYPE, State} from 'redux-anno';
import {putResolve} from 'redux-saga/effects';
import {BaseView, VIEW_TYPE} from './BaseView';

@Model(MODEL_TYPE.PROTOTYPE, 'WelcomeView')
export class WelcomeView extends BaseView {
  type = VIEW_TYPE.WELCOME_VIEW;

  @State welcomeMsg = createState<string>('');

  constructor() {
    super('Welcome View');
  }

  *onPostEnter() {
    yield putResolve(this.welcomeMsg.create(`Welcome Msg: ${this.title}`));
    return;
  }

  *onPreLeave() {
    console.log('[WelcomeView::onPreLeave]', this.title);
    return;
  }
}
