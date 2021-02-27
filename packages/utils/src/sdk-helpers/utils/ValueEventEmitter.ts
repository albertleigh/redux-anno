type ValueUpdateListener<T> = (value: T) => void;

export class ValueEventEmitter<T = any> {
  private _listeners: ValueUpdateListener<T>[] = [];

  constructor(public value: T) {}

  subscribe(listener: ValueUpdateListener<T>) {
    this._listeners.push(listener);
  }

  unsubscribe(listener: ValueUpdateListener<T>) {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  emit(value: T) {
    this.value = value;
    this._listeners.forEach((l) => l(value));
  }
}

export default ValueEventEmitter;
