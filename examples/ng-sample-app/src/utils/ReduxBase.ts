import {Directive, OnDestroy} from '@angular/core';
import {Store, Unsubscribe} from 'redux';

@Directive()
export abstract class ReduxBase implements OnDestroy {
  abstract mapState(): void;

  private readonly _unsubscribe: Unsubscribe;

  protected constructor(store: Store) {
    this._unsubscribe = store.subscribe(() => {
      this.mapState();
    });
  }

  ngOnDestroy(): void {
    this._unsubscribe && this._unsubscribe();
  }
}

export default ReduxBase;
