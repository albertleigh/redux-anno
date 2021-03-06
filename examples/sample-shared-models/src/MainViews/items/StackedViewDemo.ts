import {MAIN_VIEW_TYPE, MainBaseView} from '../base';
import {Model, MODEL_TYPE} from 'redux-anno';

@Model(MODEL_TYPE.PROTOTYPE, 'StackedViewDemo')
export class StackedViewDemo extends MainBaseView {
  type = MAIN_VIEW_TYPE.STACKED_VIEWS_DEMO;
  constructor() {
    super(MAIN_VIEW_TYPE.STACKED_VIEWS_DEMO.title);
  }
}
