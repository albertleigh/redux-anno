import {BaseViewItem} from 'redux-anno-utils/lib/examples/StackViews/ViewItem';

export enum MAIN_VIEW_TYPE {
  STACKED_VIEWS_DEMO = 'MAIN_STACKED_VIEWS',
  CACHED_REPO_DEMO = 'MAIN_CACHED_REPO',
}

export abstract class MainBaseView extends BaseViewItem {
  abstract type: MAIN_VIEW_TYPE;
}
