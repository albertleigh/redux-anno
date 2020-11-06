import {MAIN_VIEW_TYPE, MainBaseView} from '../base';
import {Model, MODEL_TYPE} from 'redux-anno';

@Model(MODEL_TYPE.PROTOTYPE)
export class CacheDemo extends MainBaseView {
  type = MAIN_VIEW_TYPE.CACHED_REPO_DEMO;
  constructor() {
    super(MAIN_VIEW_TYPE.CACHED_REPO_DEMO.title);
  }
}
