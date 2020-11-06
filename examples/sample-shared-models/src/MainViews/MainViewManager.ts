import {AnyClass, getContext, InsTyp, Model, MODEL_TYPE, Saga, SAGA_TYPE} from 'redux-anno';
import {BaseStackViewManager} from 'redux-anno-utils/lib/examples/StackViews/StackViewManager';

import {MAIN_VIEW_TYPE, MainBaseView} from './base';
import {CacheDemo} from './items/CacheDemo';
import {StackedViewDemo} from './items/StackedViewDemo';

export interface MainViewOption {
  type: MAIN_VIEW_TYPE;
  label: string;
  buildRedirectArgs: (url: URL) => Parameters<MainViewManager['redirectTo']>[0];
  onClick: (evt: any) => void;
}

export const mainViewOptions: MainViewOption[] = [
  {
    type: MAIN_VIEW_TYPE.STACKED_VIEWS_DEMO,
    label: 'Stacked View',
    buildRedirectArgs: () => ({
      model: StackedViewDemo,
      args: [],
    }),
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
    buildRedirectArgs: () => ({
      model: CacheDemo,
      args: [],
    }),
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
  *onPageAdded(ins: InsTyp<AnyClass<MainBaseView>>): Generator<any, any, any> {
    history.pushState(ins.type.state, ins.type.title, ins.type.url);
    return;
  }

  *onPageRemoved(_ins: InsTyp<AnyClass<MainBaseView>>): Generator<any, any, any> {
    console.log('[StackedViewManger::onPageRemoved]', _ins);
    return;
  }

  @Saga(SAGA_TYPE.AUTO_RUN)
  *entry() {
    let mainViewToRestore: MainViewOption;

    if (
      mainViewOptions.some((oneOption) => {
        if (window.location.pathname.indexOf(oneOption.type.url) === 0) {
          mainViewToRestore = oneOption;
          return true;
        } else {
          return false;
        }
      })
    ) {
      yield* this.redirectTo(mainViewToRestore!.buildRedirectArgs(new URL(document.URL)));
    } else {
      yield* this.redirectTo({
        model: StackedViewDemo,
        args: [],
      });
    }
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
