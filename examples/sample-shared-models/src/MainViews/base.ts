import {BaseViewItem} from 'redux-anno-utils/lib/examples/StackViews/ViewItem';

export type MainViewIcon = 'ViewComfy' | 'Storage';
export class MAIN_VIEW_TYPE {
  public static STACKED_VIEWS_DEMO = new MAIN_VIEW_TYPE('Stacked View', '/stacked-view');
  public static CACHED_REPO_DEMO = new MAIN_VIEW_TYPE('Cached Repo', '/cached-repo', 'Storage');

  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly iconType: MainViewIcon = 'ViewComfy',
    public readonly state: any = {}
  ) {}
}

export abstract class MainBaseView extends BaseViewItem {
  abstract type: MAIN_VIEW_TYPE;
}
