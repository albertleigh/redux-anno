import {DELETE_STATE_VALUE, _InnerStateField, STATE_ADDL_FIELD, STATE_KEYS_FIELD} from './base';
import {StateActionHelper, implementActionHelper} from './action';
import {AnyClass, KeysOfType, isObject, prePopulateSetFieldViaPrototype, Proto} from './utils';
import {NonObjectStateFound} from './errors';

export function getSubState(baseState: any, path: string, subPath?: string): any {
  if (!isObject(baseState)) {
    throw new NonObjectStateFound('Failed to get sub state from a non-object base state');
  }
  let state = baseState[path];
  if (!subPath) {
    return state;
  }
  if (!isObject(state)) {
    throw new NonObjectStateFound('Failed to get dynamic sub state from a non-object sub state');
  }
  state = state[subPath];
  return state;
}
export function setSubState(baseState: any, value: any, path: string, subPath?: string): any {
  if (!baseState) {
    baseState = {};
  }
  if (!isObject(baseState)) {
    throw new NonObjectStateFound('Failed to set sub state from a non-object base state');
  }

  if (!!subPath) {
    const state = setSubState(baseState[path], value, subPath);
    if (baseState[path] === state) {
      return baseState;
    }
    return {
      ...baseState,
      [path]: state,
    };
  } else {
    if (baseState[path] === value) {
      return baseState;
    }
    baseState = {...baseState};
    if (value === DELETE_STATE_VALUE) {
      delete baseState[path];
    } else {
      baseState[path] = value;
    }
    return baseState;
  }
}

export interface IsAnnoStateField {
  [STATE_ADDL_FIELD]: '__anno_state';
}

export type StateField<T = unknown> = IsAnnoStateField & StateActionHelper<T>;

export function createState<TState, _TModel extends AnyClass = any>(state?: TState): StateField<TState>;
export function createState<TState, TModel extends AnyClass = any>(
  state?: (this: InstanceType<TModel>) => TState
): StateField<TState>;
export function createState<TState, TModel extends AnyClass = any>(...args: any[]) {
  let innerStateField: _InnerStateField<TState, TModel>;
  if (typeof args[0] === 'function') {
    innerStateField = {
      isStateCreator: true,
      state: args[0],
    };
  } else {
    innerStateField = {
      isStateCreator: false,
      state: args[0],
    };
  }
  // todo: infer primitive types
  return (innerStateField as unknown) as StateField<TState>;
}

/**
 *  State Annotation
 * @param target
 * @param propertyKey
 * @constructor
 */
export function State<TKey extends string, TTarget extends {[K in TKey]: IsAnnoStateField}>(
  target: TTarget,
  propertyKey: TKey
) {
  const privateTarget = target as Proto<TTarget>;
  prePopulateSetFieldViaPrototype(target as Proto<TTarget>, STATE_KEYS_FIELD);
  privateTarget.constructor[STATE_KEYS_FIELD]!.add(propertyKey);
  implementActionHelper(target.constructor as any, propertyKey);
}

export type TransformState<T extends Record<string | number, any>> = T & {
  [STATE_KEYS_FIELD]: Pick<T, KeysOfType<T, IsAnnoStateField>>;
};

export type WithStates<T extends AnyClass> = T & {
  new (...args: ConstructorParameters<T>): TransformState<InstanceType<T>>;
};

export function withStates<TModel extends AnyClass>(PreWrappedModel: TModel): WithStates<TModel> {
  const ModelWithStates = function (this: WithStates<TModel>) {
    // const self = this as AsImdAnnoInst<any>;
    //  Class constructor Counter cannot be invoked without 'new', ding it
    // PreWrappedModel.apply(this, arguments as any)
    const args = arguments || [];
    Object.assign(this, new PreWrappedModel(...args));
  };
  ModelWithStates.prototype = PreWrappedModel.prototype;

  // Object.defineProperty(ModelWithStates.prototype, "". {})
  return (ModelWithStates as unknown) as WithStates<TModel>;
}

export type InsHasStates = {[STATE_KEYS_FIELD]: any};
export type StateKeys<T extends InsHasStates> = keyof T[typeof STATE_KEYS_FIELD];
export function getStateProperty<TIns extends InsHasStates, TKey extends StateKeys<TIns>>(instance: TIns, key: TKey) {
  return instance[key];
}

export type ModelSates<TModel extends any> = Pick<
  {
    [K in keyof TModel]: TModel[K] extends IsAnnoStateField & StateField<infer V> ? V : never;
  },
  {[K in keyof TModel]: TModel[K] extends IsAnnoStateField ? K : never}[keyof TModel]
>;
