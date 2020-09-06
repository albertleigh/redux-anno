import {InsTyp, InsArg} from './instanced';
import {AnyClass} from './utils';

import {instantiate, disband} from './AnnoContext';

export class PrototypeArray<M, C extends AnyClass = AnyClass<M>> {
  public insArr: Array<InsTyp<C>> = [];

  constructor(private contextName: string) {}

  get length(): number {
    return this.insArr.length;
  }

  private _modByLen(index: number): number {
    const len = this.length;
    return ((index % len) + len) % len;
  }

  toString(): string {
    return this.insArr.toString();
  }

  toLocaleString(): string {
    return this.insArr.toLocaleString();
  }

  pop(): InsTyp<C> | undefined {
    return disband(this.insArr.pop());
  }

  push(...items: InsArg<C>[]): number {
    return this.insArr.push(...items.map((one) => instantiate<C>(one[0], one[1], this.contextName)));
  }

  concat(...items: InsArg<C>[]): InsTyp<C>[] {
    this.insArr = this.insArr.concat(...items.map((one) => instantiate(one[0], one[1], this.contextName)));
    return this.insArr;
  }

  join(separator?: string): string {
    return this.insArr.join(separator);
  }

  reverse(): InsTyp<C>[] {
    this.insArr = this.insArr.reverse();
    return this.insArr;
  }

  shift(): InsTyp<C> | undefined {
    return !!this.insArr.length ? disband(this.insArr.shift()) : undefined;
  }

  slice(start?: number, end?: number): InsTyp<C>[] {
    const sliced = this.insArr.slice(start, end);
    const slicedSet = new Set(sliced);
    for (const one of this.insArr) {
      if (!slicedSet.has(one)) {
        disband(one);
      }
    }
    return (this.insArr = sliced);
  }

  sort(compareFn?: (a: InsTyp<C>, b: InsTyp<C>) => number): InsTyp<C>[] {
    return (this.insArr = this.insArr.sort(compareFn));
  }

  // splice(start: number, deleteCount?: number): InsTyp<C>[] {
  splice(start: number, ...rest: [number?, ...InsArg<C>[]]): InsTyp<C>[] {
    start = this._modByLen(start);
    let deleteCount = this.insArr.length - start;
    const toPushed: InsArg<C>[] = [...rest] as any;
    if (!!toPushed && Array.isArray(toPushed) && !!toPushed.length && typeof rest[0] === 'number') {
      deleteCount = rest[0];
      toPushed.splice(0, 1);
    }
    const deleted = this.insArr.splice(start, deleteCount);
    for (const one of deleted) {
      disband(one);
    }
    this.push(...(toPushed || []));
    return deleted;
  }

  unshift(...items: InsArg<C>[]): number {
    return this.insArr.unshift(...items.map((one) => instantiate(one[0], one[1], this.contextName)));
  }

  indexOf(searchElement: InsTyp<C>, fromIndex?: number): number {
    return this.insArr.indexOf(searchElement, fromIndex);
  }

  lastIndexOf(searchElement: InsTyp<C>, fromIndex?: number): number {
    return this.insArr.lastIndexOf(searchElement, fromIndex);
  }

  every<S extends InsTyp<C>>(
    predicate: (value: InsTyp<C>, index: number, array: InsTyp<C>[]) => value is S,
    thisArg?: any
  ): this is S[] {
    return this.insArr.every(predicate, thisArg);
  }

  some(predicate: (value: InsTyp<C>, index: number, array: InsTyp<C>[]) => unknown, thisArg?: any): boolean {
    return this.insArr.some(predicate, thisArg);
  }

  forEach(callbackfn: (value: InsTyp<C>, index: number, array: InsTyp<C>[]) => void, thisArg?: any) {
    this.insArr.forEach(callbackfn, thisArg);
  }

  map<U>(callbackfn: (value: InsTyp<C>, index: number, array: InsTyp<C>[]) => U, thisArg?: any): U[] {
    return this.insArr.map(callbackfn, thisArg);
  }

  filter<S extends InsTyp<C>>(
    predicate: (value: InsTyp<C>, index: number, array: InsTyp<C>[]) => value is S,
    thisArg?: any
  ): S[] {
    return this.insArr.filter(predicate, thisArg);
  }

  reduce(
    callbackfn: (
      previousValue: InsTyp<C>,
      currentValue: InsTyp<C>,
      currentIndex: number,
      array: InsTyp<C>[]
    ) => InsTyp<C>
  ): InsTyp<C> {
    return this.insArr.reduce(callbackfn);
  }

  reduceRight(
    callbackfn: (
      previousValue: InsTyp<C>,
      currentValue: InsTyp<C>,
      currentIndex: number,
      array: InsTyp<C>[]
    ) => InsTyp<C>
  ): InsTyp<C> {
    return this.insArr.reduceRight(callbackfn);
  }

  find<S extends InsTyp<C>>(
    predicate: (this: void, value: InsTyp<C>, index: number, obj: InsTyp<C>[]) => value is S,
    thisArg?: any
  ): S | undefined {
    return this.insArr.find(predicate, thisArg);
  }

  findIndex(predicate: (value: InsTyp<C>, index: number, obj: InsTyp<C>[]) => unknown, thisArg?: any): number {
    return this.insArr.findIndex(predicate, thisArg);
  }

  fill(value: InsArg<C>, start?: number, end?: number): InsTyp<C>[] {
    start = !!start ? this._modByLen(start) : 0;
    end = !!end ? this._modByLen(end) : this.length;
    for (let i = start; i < end; i++) {
      disband(this.insArr[i]);
      this.insArr[i] = instantiate(value[0], value[1]);
    }
    return this.insArr;
  }

  copyWithin(target: number, start: number, end?: number): InsTyp<C>[] {
    const O = Object(this.insArr);
    const len = this.length;
    const relativeTarget = target >> 0;
    let to = relativeTarget < 0 ? Math.max(len + relativeTarget, 0) : Math.min(relativeTarget, len);
    const relativeStart = start >> 0;
    let from = relativeStart < 0 ? Math.max(len + relativeStart, 0) : Math.min(relativeStart, len);

    const relativeEnd = end === undefined ? len : end >> 0;
    const final = relativeEnd < 0 ? Math.max(len + relativeEnd, 0) : Math.min(relativeEnd, len);

    let count = Math.min(final - from, len - to);

    let direction = 1;

    if (from < to && to < from + count) {
      direction = -1;
      from += count - 1;
      to += count - 1;
    }

    // Step 18.
    while (count > 0) {
      disband(to);
      if (from in O) {
        O[to] = O[from];
      } else {
        delete O[to];
      }

      from += direction;
      to += direction;
      count--;
    }

    return (this.insArr = O);
  }

  [Symbol.iterator](): IterableIterator<InsTyp<C>> {
    return this.insArr[Symbol.iterator]();
  }

  entries(): IterableIterator<[number, InsTyp<C>]> {
    return this.insArr.entries();
  }

  keys(): IterableIterator<number> {
    return this.insArr.keys();
  }

  values(): IterableIterator<InsTyp<C>> {
    return this.insArr.values();
  }

  flatMap<U, This = undefined>(
    callback: (this: This, value: InsTyp<C>, index: number, array: InsTyp<C>[]) => ReadonlyArray<U> | U,
    thisArg?: This
  ): U[] {
    return this.insArr.flatMap(callback, thisArg);
  }

  flat<A extends InsTyp<C>, D extends number>(depth?: D): FlatArray<A, D>[] {
    return this.insArr.flat(depth) as any;
  }

  includes(searchElement: InsTyp<C>, fromIndex?: number): boolean {
    return this.insArr.includes(searchElement, fromIndex);
  }

  [Symbol.unscopables](): {
    copyWithin: boolean;
    entries: boolean;
    fill: boolean;
    find: boolean;
    findIndex: boolean;
    keys: boolean;
    values: boolean;
  } {
    return this.insArr[Symbol.unscopables]();
  }
}
