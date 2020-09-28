import {AnyClass, getContext, InsTyp, Model, MODEL_TYPE, Saga, SAGA_TYPE} from 'redux-anno';
import {BaseStackViewManager} from 'redux-anno-utils/lib/examples/StackViews/StackViewManager';
import {MAIN_VIEW_TYPE, MainBaseView} from 'src/stores/MainViews/base';
import SvgIcon from '@material-ui/core/SvgIcon';
import ViewComfyIcon from '@material-ui/icons/ViewComfy';
import StorageIcon from '@material-ui/icons/StorageTwoTone';

import {StackedViewDemo} from 'src/stores/MainViews/items/StackedViewDemo';
import {CacheDemo} from 'src/stores/MainViews/items/CacheDemo';

export interface MainViewOption {
  type: MAIN_VIEW_TYPE;
  label: string;
  icon: typeof SvgIcon;
  onClick: (evt: any) => void;
}

export const mainViewOptions: MainViewOption[] = [
  {
    type: MAIN_VIEW_TYPE.STACKED_VIEWS_DEMO,
    label: 'Stacked View',
    icon: ViewComfyIcon,
    onClick: () => {
      const defaultCtx = getContext();
      const mainViewMgr = defaultCtx.getOneInstance(MainViewManager);
      mainViewMgr.redirectTo.dispatch({
        model: StackedViewDemo,
        args: [],
      });
    },
  },
  {
    type: MAIN_VIEW_TYPE.CACHED_REPO_DEMO,
    label: 'Cached Repo',
    icon: StorageIcon,
    onClick: () => {
      const defaultCtx = getContext();
      const mainViewMgr = defaultCtx.getOneInstance(MainViewManager);
      mainViewMgr.redirectTo.dispatch({
        model: CacheDemo,
        args: [],
      });
    },
  },
];

@Model(MODEL_TYPE.SINGLETON)
export class MainViewManager extends BaseStackViewManager<AnyClass<MainBaseView>> {
  *onPageAdded(_ins: InsTyp<AnyClass<MainBaseView>>): Generator<any, any, any> {
    console.log('[StackedViewManger::onPageAdded]', _ins);
    return;
  }

  *onPageRemoved(_ins: InsTyp<AnyClass<MainBaseView>>): Generator<any, any, any> {
    console.log('[StackedViewManger::onPageRemoved]', _ins);
    return;
  }

  @Saga(SAGA_TYPE.AUTO_RUN)
  *entry() {
    yield* this.redirectTo({
      model: StackedViewDemo,
      args: [],
    });
  }

  @Saga()
  *redirectToOneMainView<C extends AnyClass<MainBaseView>>(payload: {
    model: C;
    args: ConstructorParameters<C>;
    force?: boolean;
  }) {
    yield* this.redirectTo(payload);
  }
}
export default MainViewManager;
