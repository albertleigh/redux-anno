import {AnyClass} from './utils';
import {InsTyp, InsArg} from './instanced';

import {instantiate, disband} from './AnnoContext';

export class PrototypeSet<M, C extends AnyClass = AnyClass<M>> {
  public innerSet: Set<InsTyp<C>> = new Set();

  constructor(private contextName: string) {}

  get size(): number {
    return this.innerSet.size;
  }

  add(value: InsArg<C>): Set<InsTyp<C>> {
    return this.innerSet.add(instantiate(value[0], value[1], this.contextName));
  }

  clear() {
    for (const one of this.innerSet) {
      disband(one);
    }
    this.innerSet.clear();
  }

  delete(value: InsTyp<C>): boolean {
    disband(value);
    return this.innerSet.delete(value);
  }

  forEach(callbackfn: (value: InsTyp<C>, value2: InsTyp<C>, set: Set<InsTyp<C>>) => void, thisArg?: any) {
    this.innerSet.forEach(callbackfn, thisArg);
  }

  has(value: InsTyp<C>): boolean {
    return this.innerSet.has(value);
  }

  [Symbol.iterator](): IterableIterator<InsTyp<C>> {
    return this.innerSet[Symbol.iterator]();
  }

  entries(): IterableIterator<[InsTyp<C>, InsTyp<C>]> {
    return this.innerSet.entries();
  }

  keys(): IterableIterator<InsTyp<C>> {
    return this.innerSet.keys();
  }

  values(): IterableIterator<InsTyp<C>> {
    return this.innerSet.values();
  }
}
