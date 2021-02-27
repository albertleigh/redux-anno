import {createInstance, Instance, Model, MODEL_TYPE} from 'redux-anno';

import {Counter} from './Counter';
import {MainViewManager} from './MainViews/MainViewManager';
import {StackedViewManager} from './StackedViews/StackedViewManager';

@Model(MODEL_TYPE.SINGLETON, 'Entry')
export class Entry {
  @Instance counter = createInstance(Counter);
  @Instance mainVwMgr = createInstance(MainViewManager);
  @Instance stackedVwMgr = createInstance(StackedViewManager);
}

export default Entry;
