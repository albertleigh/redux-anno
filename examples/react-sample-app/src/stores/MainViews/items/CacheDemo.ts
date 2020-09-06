import {MAIN_VIEW_TYPE, MainBaseView} from 'src/stores/MainViews/base';
import {Model, MODEL_TYPE} from 'redux-anno';

@Model(MODEL_TYPE.PROTOTYPE)
export class CacheDemo extends MainBaseView {
  type = MAIN_VIEW_TYPE.CACHED_REPO_DEMO;
}
