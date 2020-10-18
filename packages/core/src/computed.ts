import {WATCHED_ADDL_FIELD, WATCHED_KEYS_FIELD} from './base';
import {ComputedStateAction, implementActionHelper} from './action';
import {IsAnnoStateField} from './state';
import {AnyClass, KeysOfType, Proto, prePopulateSetFieldViaPrototype} from './utils';

export interface IsAnnoComputedField {
  [WATCHED_ADDL_FIELD]: '__anno_watched';
}

export type ComputedField<T = unknown> = IsAnnoComputedField & ComputedStateAction<T>;

export function createComputed<TState, TModel extends AnyClass = any>(
  creator: (this: InstanceType<TModel>) => TState,
  dependencies: Array<KeysOfType<InstanceType<TModel>, IsAnnoStateField>>,
  debounceTimeInMs?: number
): ComputedField<TState> {
  return ({
    creator,
    dependencies,
    debounceTimeInMs,
  } as unknown) as ComputedField<TState>;
}

export function Computed<TKey extends string, TTarget extends {[K in TKey]: IsAnnoComputedField}>(
  target: TTarget,
  propertyKey: TKey
) {
  const privateTarget = target as Proto<TTarget>;
  prePopulateSetFieldViaPrototype(privateTarget, WATCHED_KEYS_FIELD);
  privateTarget.constructor[WATCHED_KEYS_FIELD]!.add(propertyKey);
  implementActionHelper(target.constructor as any, propertyKey);
}

export type TransformComputed<T extends Record<string | number, any>> = T & {
  [WATCHED_KEYS_FIELD]: Pick<T, KeysOfType<T, IsAnnoComputedField>>;
};

export type WithComputed<T extends AnyClass> = T & {
  new (...args: ConstructorParameters<T>): TransformComputed<InstanceType<T>>;
};
export function withComputed<TModel extends AnyClass>(PreWrappedModel: TModel): WithComputed<TModel> {
  const ModelWithComputed = function (this: WithComputed<TModel>) {
    PreWrappedModel.apply(this, arguments as any);
  };
  ModelWithComputed.prototype = PreWrappedModel.prototype;
  return (ModelWithComputed as unknown) as WithComputed<TModel>;
}
