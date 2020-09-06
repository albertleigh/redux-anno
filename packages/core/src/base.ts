import {AnyClass} from './utils';
// global
export const DELETE_STATE_VALUE = '__annoDeleteStateValue__' as const;
// action
export const ACTION_FIELD_PREFIX = '__annoAct' as const;
export function annoActionMethod(
  propertyKey: string,
  methodName: string,
  prefix: string = ACTION_FIELD_PREFIX
): string {
  return `${prefix}__${propertyKey}__${methodName}__`;
}
export interface ThunkPromiseHandler {
  resolve: (value: any) => void;
  reject: (value: any) => void;
}
// state
export type _InnerStateField<TState, TModel extends AnyClass = any> =
  | {
      isStateCreator: false;
      state: TModel;
    }
  | {
      isStateCreator: true;
      state: (this: TModel) => TState;
    };

export const STATE_ADDL_FIELD = '__isAnnoState__' as const;
export const STATE_KEYS_FIELD = '__annoStateKeys__' as const;

// reducer
export const REDUCER_KEYS_FIELD = '__annoReducerKeys__' as const;

// thunk
export const THUNK_KEYS_FIELD = '__annoThunkKeys__' as const;

// saga

export enum SAGA_TYPE {
  MANUALLY = 0x1,
  AUTO_RUN = 0x2,
  TAKE_EVERY = 0x1f,
  TAKE_LATEST = 0x2f,
  TAKE_LEADING = 0x3f,
}

export const SAGA_KEYS_FIELD = '__annoSagaKeys__' as const;

// instance
export const INSTANCE_KEYS_FIELD = '__annoInstanceKeys__' as const;

// model

export enum MODEL_TYPE {
  MANUALLY = 0x1,
  SINGLETON = 0x2,
  PROTOTYPE = 0x3,
}

export const MODEL_NAME_FIELD = '__annoModelName__' as const;
export const MODEL_TYPE_FIELD = '__annoModelType__' as const;
export const MODEL_SELF_KEYS_FIELD = '__annoModelSelfKeys__' as const;

// todo chaining typo of __proto__
export type ImdAnnoConstructor<TModel extends AnyClass> = TModel & {
  [STATE_KEYS_FIELD]?: Set<string>;
  [REDUCER_KEYS_FIELD]?: Set<string>;
  [THUNK_KEYS_FIELD]?: Set<string>;
  [SAGA_KEYS_FIELD]?: Map<string, SAGA_TYPE>;
  [INSTANCE_KEYS_FIELD]?: Set<string>;
  [MODEL_SELF_KEYS_FIELD]?: Map<string, ImdAnnoConstructor<any>>;
  [MODEL_NAME_FIELD]: string;
  [MODEL_TYPE_FIELD]: MODEL_TYPE;
};

export interface AnnoInstanceBase {
  contextName: string;
  modelName: string;
  modelKey: string;
}

export type AsImdAnnoInst<TModel extends AnyClass> = InstanceType<TModel> & AnnoInstanceBase;
