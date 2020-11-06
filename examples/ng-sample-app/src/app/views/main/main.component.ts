import {Component, Inject, OnInit} from '@angular/core';

import {getContext, InsTyp} from 'redux-anno';

import {MainViewManager, MainBaseView, MAIN_VIEW_TYPE} from 'sample-shared-models';

import {AppStore} from 'src/stores';
import {ReduxBase} from 'src/utils/ReduxBase';
import {Store} from 'redux';

const defaultCtx = getContext();

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.sass'],
})
export class MainComponent extends ReduxBase implements OnInit {
  private _mainViewMgr = defaultCtx.getOneInstance(MainViewManager);
  readonly MAIN_VIEW_TYPE = MAIN_VIEW_TYPE;
  currentViewType: MAIN_VIEW_TYPE | undefined;
  currentView: MainBaseView | undefined;

  constructor(@Inject(AppStore) private store: Store) {
    super(store);
    this.mapState();
  }

  mapState() {
    const viewItems = this._mainViewMgr.items.value;
    const length = viewItems.length;
    if (!!length) {
      this.currentView = viewItems[length - 1];
      this.currentViewType = this.currentView.type;
    } else {
      this.currentView = undefined;
      this.currentViewType = undefined;
    }
  }

  ngOnInit(): void {}
}
