import {AnyClass, KeysOfType, prePopulateSetFieldViaPrototype, Proto} from './utils';
import {annoActionMethod, AsImdAnnoInst, THUNK_KEYS_FIELD} from './base';
import {ActionHelper, implementActionHelper} from './action';

export type ThunkField<TPayload = any, TResult = any> =
  | ((payload: TPayload) => Promise<TResult>)
  | (() => Promise<TResult>);
export type ExtractThunkFieldPayload<T> = T extends () => Promise<any>
  ? undefined
  : T extends (payload: infer _TPayload) => Promise<any>
  ? _TPayload
  : undefined;

export type ExtractThunkFieldResult<T> = T extends
  | ((payload: any) => Promise<infer _TResult>)
  | (() => Promise<infer _TResult>)
  ? _TResult
  : undefined;

export function Thunk() {
  return function <TKey extends string, TTarget extends {[K in TKey]: ThunkField}>(
    target: TTarget,
    propertyKey: TKey
    // descriptor: PropertyDescriptor
  ) {
    const privateTarget = target as Proto<TTarget>;
    prePopulateSetFieldViaPrototype(privateTarget, THUNK_KEYS_FIELD);
    privateTarget.constructor[THUNK_KEYS_FIELD].add(propertyKey);
    implementActionHelper(target.constructor as any, propertyKey);
  };
}

export type TransformThunk<T extends Record<string | number, any>> = {
  [P in keyof T]: T[P] extends ThunkField
    ? T[P] & ActionHelper<ExtractThunkFieldPayload<T[P]>, ExtractThunkFieldResult<T[P]>>
    : T[P];
} & {
  [THUNK_KEYS_FIELD]: Pick<T, KeysOfType<T, ThunkField>>;
};

export type WithThunk<T extends AnyClass> = {
  [K in keyof T]: T[K];
} & {
  new (...args: ConstructorParameters<T>): TransformThunk<InstanceType<T>>;
};

export function withThunk<TModel extends AnyClass>(PreWrappedModel: TModel): WithThunk<TModel> {
  const ModelWithThunk = function (this: WithThunk<TModel>) {
    PreWrappedModel.apply(this, arguments as any);
    const self = this as AsImdAnnoInst<any>;
    for (const thunkKey of PreWrappedModel.prototype.constructor[THUNK_KEYS_FIELD]) {
      self[thunkKey] = PreWrappedModel.prototype[thunkKey].bind(self);
      self[thunkKey]['type'] = self[annoActionMethod(thunkKey, 'type')];
      self[thunkKey]['is'] = self[annoActionMethod(thunkKey, 'is')].bind(this);
      self[thunkKey]['create'] = self[annoActionMethod(thunkKey, 'create')].bind(this);
      self[thunkKey]['dispatch'] = self[annoActionMethod(thunkKey, 'dispatch')].bind(this);
    }
  };
  ModelWithThunk.prototype = PreWrappedModel.prototype;
  return (ModelWithThunk as unknown) as WithThunk<TModel>;
}
