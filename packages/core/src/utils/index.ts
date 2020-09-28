import {ImdAnnoConstructor} from '../base';

export type Nullable<T> = T | null | undefined;

export function notNull<T = any>(obj: T, preset: T): T {
  return (!!obj && obj) || preset;
}

export type AnyClass<T = any> = {
  new (...args: any[] | any): T;
};

export type KeysOfType<TTarget, TValue> = {
  [K in keyof TTarget]: TTarget[K] extends TValue ? K : never;
}[keyof TTarget];

export function isObject(obj: unknown): boolean {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj);
}

export type Proto<TBase> = TBase & {
  constructor: ImdAnnoConstructor<any>;
  __proto__: any;
};
export function prePopulateSetFieldViaPrototype<TTarget>(proto: Proto<TTarget>, fieldName: string): void {
  if (!proto.constructor.hasOwnProperty(fieldName)) {
    const theNewSet = new Set();
    proto.constructor[fieldName] = theNewSet;
    // pre populate from __proto__ chain
    let theProto = proto.__proto__;
    while (!!theProto) {
      if (!!theProto.constructor?.hasOwnProperty(fieldName)) {
        for (const oneParentStateField of theProto.constructor[fieldName]) {
          theNewSet.add(oneParentStateField);
        }
      }
      theProto = theProto.__proto__;
    }
  }
}
export function prePopulateMapFieldViaPrototype<TTarget>(proto: Proto<TTarget>, fieldName: string) {
  if (!proto.constructor.hasOwnProperty(fieldName)) {
    const theNewMap = new Map();
    proto.constructor[fieldName] = theNewMap;
    // pre populate from __proto__ chain
    let theProto = proto.__proto__;
    while (!!theProto) {
      if (theProto.constructor?.hasOwnProperty(fieldName)) {
        for (const [oneKey, oneType] of theProto.constructor[fieldName]) {
          theNewMap.set(oneKey, oneType);
        }
      }
      theProto = theProto.__proto__;
    }
  }
}
