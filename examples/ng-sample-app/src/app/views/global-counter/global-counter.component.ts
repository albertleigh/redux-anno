import {Component, Inject, OnInit} from '@angular/core';
import {Store} from 'redux';
import {getContext} from 'redux-anno';
import {Counter as CounterModel} from 'sample-shared-models';

import {AppStore} from 'src/stores';
import {ReduxBase} from 'src/utils/ReduxBase';

const defaultCtx = getContext();

@Component({
  selector: 'app-global-counter',
  templateUrl: './global-counter.component.html',
  styleUrls: ['./global-counter.component.scss'],
})
export class GlobalCounterComponent extends ReduxBase implements OnInit {
  counter: number;
  private _counterInst = defaultCtx.getOneInstance(CounterModel);

  constructor(@Inject(AppStore) private store: Store) {
    super(store);
  }

  ngOnInit(): void {
    this.mapState();
  }

  mapState() {
    this.counter = this._counterInst.count.value;
  }

  updateCounterVal(nextVal: number) {
    this._counterInst.updateCount.dispatch(nextVal);
  }
}
