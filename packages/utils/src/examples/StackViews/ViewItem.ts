import {Saga} from 'redux-anno';

export class BaseViewItem {
  title: string;

  constructor(title: string) {
    this.title = title;
  }

  get isUnsaved() {
    return false;
  }

  *onPostEnter(): Generator<any, any, any> {
    return;
  }

  *onPreLeave(): Generator<any, any, any> {
    return;
  }

  @Saga()
  *shouldClose(force = false): Generator<any, boolean, any> {
    if (force) {
      return true;
    }
    return true;
  }

  @Saga()
  *initialize() {
    yield* this.onPostEnter();
    return;
  }

  @Saga()
  *close() {
    yield* this.onPreLeave();
    return;
  }
}
