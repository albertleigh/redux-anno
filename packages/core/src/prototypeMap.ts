import {InsTyp, InsArg} from './instanced';
import {AnyClass} from './utils';

import {instantiate, disband} from './AnnoContext';

export class PrototypeMap<K, M, C extends AnyClass = AnyClass<M>> {
  public innerMap: Map<K, InsTyp<C>> = new Map();

  constructor(private contextName: string) {}

  get size() {
    return this.innerMap.size;
  }

  clear() {
    for (const [_, ins] of this.innerMap) {
      disband(ins);
    }
    this.innerMap.clear();
  }

  delete(key: K): boolean {
    const theOne = this.innerMap.get(key);
    if (!!theOne) {
      disband(theOne);
    }
    return this.innerMap.delete(key);
  }

  forEach(callbackfn: (value: InsTyp<C>, key: K, map: Map<K, InsTyp<C>>) => void, thisArg?: any) {
    this.innerMap.forEach(callbackfn, thisArg);
  }

  get(key: K): InsTyp<C> | undefined {
    return this.innerMap.get(key);
  }

  has(key: K): boolean {
    return this.innerMap.has(key);
  }

  set(key: K, value: InsArg<C>): Map<K, InsTyp<C>> {
    const theOne = instantiate(value[0], value[1], this.contextName);
    return this.innerMap.set(key, theOne);
  }

  [Symbol.iterator](): IterableIterator<[K, InsTyp<C>]> {
    return this.innerMap[Symbol.iterator]();
  }

  entries(): IterableIterator<[K, InsTyp<C>]> {
    return this.innerMap.entries();
  }

  keys(): IterableIterator<K> {
    return this.innerMap.keys();
  }

  values(): IterableIterator<InsTyp<C>> {
    return this.innerMap.values();
  }
}
