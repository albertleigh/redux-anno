import {Reducer as ReduxReducer} from 'redux';

import {
  DELETE_STATE_VALUE,
  _InnerStateField,
  STATE_KEYS_FIELD,
  REDUCER_ADDL_FIELD,
  REDUCER_KEYS_FIELD,
  AsImdAnnoInst,
  annoActionMethod,
  ImdAnnoConstructor,
} from './base';
import {getContext} from './AnnoContext';
import {
  RegisterOption,
  registerActionHelper,
  UnRegisterOption,
  unregisterActionHelper,
  reloadActionHelper,
  ReloadOption,
  implementActionHelper,
  FullActionHelper,
  PartialActionHelper,
  ActionHelper,
} from './action';
import {getSubState, setSubState, ModelSates} from './state';
import {AnyClass, KeysOfType, prePopulateSetFieldViaPrototype, Proto} from './utils';

export interface IsAnnoReducerField {
  [REDUCER_ADDL_FIELD]: '__anno_reducer';
}

export type FullModelReducer<TState = any, TPayload = any> = (previousState: TState, payload: TPayload) => TState;
type ExtractFullModelReducerState<T> = T extends (param1: infer _TState, _param2: any) => any ? _TState : unknown;
type ExtractFullModelReducerPayload<T> = T extends (param1: any, _param2: infer _TPayload) => any ? _TPayload : unknown;

export type PartialModelReducer<TState = any> = (previousState: TState) => TState;
type ExtractPartialModelReducerState<T> = T extends (param1: infer _TState) => any ? _TState : unknown;

export type ModelReducer = FullModelReducer | PartialModelReducer;

export type FullReducerField<TState, TPayload> = FullModelReducer<TState, TPayload> &
  FullActionHelper<TPayload, void> &
  IsAnnoReducerField;
export type PartialReducerField<TState> = PartialModelReducer<ModelSates<TState>> &
  PartialActionHelper<void> &
  IsAnnoReducerField;

export type ExtractReducerFieldPayload<T> = T extends (state: any, payload: infer _TPayload) => void
  ? _TPayload
  : undefined;
export function Reducer<
  TKey extends string,
  TTarget extends {
    [K in TKey]: IsAnnoReducerField;
  }
>(target: TTarget, propertyKey: TKey) {
  const privateTarget = target as Proto<TTarget>;
  prePopulateSetFieldViaPrototype(target as Proto<TTarget>, REDUCER_KEYS_FIELD);
  privateTarget.constructor[REDUCER_KEYS_FIELD]!.add(propertyKey);
  implementActionHelper(target.constructor as any, propertyKey);
}
export type TransformReducer<T extends Record<string | number, any>> = {
  [P in keyof T]: T[P] extends IsAnnoReducerField ? ActionHelper<ExtractReducerFieldPayload<T[P]>, void> : T[P];
} & {
  [REDUCER_KEYS_FIELD]: Pick<T, KeysOfType<T, IsAnnoReducerField>>;
};

export type WithReducers<T extends AnyClass> = T & {
  new (...args: ConstructorParameters<T>): TransformReducer<InstanceType<T>>;
};

export function withReducers<TModel extends AnyClass>(PreWrappedModel: TModel): WithReducers<TModel> {
  const ModelWithReducers = function (this: WithReducers<TModel>) {
    PreWrappedModel.apply(this, arguments as any);
    const self = this as AsImdAnnoInst<any>;
    for (const reducerKey of PreWrappedModel.prototype.constructor[REDUCER_KEYS_FIELD]) {
      self[reducerKey]['type'] = self[annoActionMethod(reducerKey, 'type')];
      self[reducerKey]['is'] = self[annoActionMethod(reducerKey, 'is')].bind(this);
      self[reducerKey]['create'] = self[annoActionMethod(reducerKey, 'create')].bind(this);
      self[reducerKey]['dispatch'] = self[annoActionMethod(reducerKey, 'dispatch')].bind(this);
    }
  };
  ModelWithReducers.prototype = PreWrappedModel.prototype;
  return (ModelWithReducers as unknown) as WithReducers<TModel>;
}

export const createReducer: <
  TState = any,
  TPayload = any,
  TReducer = FullModelReducer<TState, TPayload> | PartialModelReducer<TState>
>(
  reducer: TReducer
) => TReducer extends PartialModelReducer
  ? PartialReducerField<ExtractPartialModelReducerState<TReducer>>
  : TReducer extends FullModelReducer
  ? FullReducerField<ExtractFullModelReducerState<TReducer>, ExtractFullModelReducerPayload<TReducer>>
  : unknown = ((reducer: any) => reducer) as any;

export function createReduxReducer(annoCtxName?: string): ReduxReducer {
  function register(rootState: any, options?: RegisterOption[]) {
    options?.forEach((option) => {
      const {instance} = option;
      if ((!annoCtxName && !instance.contextName) || instance.contextName === annoCtxName) {
        let state: any = {};
        if (!!option.state) {
          state = option.state;
        } else {
          // initially populate the state
          for (const stateKey of instance.constructor[STATE_KEYS_FIELD] as Set<string>) {
            const innerStateField = instance[stateKey] as _InnerStateField<unknown>;
            if (innerStateField.isStateCreator) {
              state[stateKey] = innerStateField.state.apply(instance);
            } else {
              state[stateKey] = innerStateField.state;
            }
          }
        }
        for (const stateKey of instance.constructor[STATE_KEYS_FIELD] as Set<string>) {
          const stateKeyObj: Record<string | number, any> = {};

          // intercept the set/get of that field for the instance
          Object.defineProperty(stateKeyObj, 'value', {
            set(value: any) {
              getContext(instance.contextName).store?.dispatch({
                type: getContext(instance.contextName).assembleActionName(
                  instance.modelName,
                  stateKey,
                  instance.modelKey
                ),
                payload: value,
              });
            },
            get(): any {
              return getSubState(
                getContext(instance.contextName).store.getState(),
                instance.modelName,
                instance.modelKey
              )?.[stateKey];
            },
            enumerable: true,
          });
          Object.defineProperty(stateKeyObj, 'type', {
            value: instance[annoActionMethod(stateKey, 'type')],
            enumerable: true,
            writable: false,
          });
          Object.defineProperty(stateKeyObj, 'is', {
            value: instance[annoActionMethod(stateKey, 'is')].bind(instance),
            enumerable: false,
            writable: false,
          });
          Object.defineProperty(stateKeyObj, 'create', {
            value: instance[annoActionMethod(stateKey, 'create')].bind(instance),
            enumerable: false,
            writable: false,
          });
          Object.defineProperty(stateKeyObj, 'dispatch', {
            value: instance[annoActionMethod(stateKey, 'dispatch')].bind(instance),
            enumerable: false,
            writable: false,
          });
          Object.defineProperty(instance, stateKey, {
            value: stateKeyObj,
            enumerable: true,
            writable: false,
          });
        }
        rootState = setSubState(rootState, state, instance.modelName, instance.modelKey);
      }
    });
    return rootState;
  }

  function unregister(rootState: any, options?: UnRegisterOption[]) {
    options?.forEach((option) => {
      const {contextName, modelName, modelKey} = option;
      if ((!annoCtxName && !contextName) || contextName === annoCtxName) {
        const theInstance = getContext(annoCtxName).removeOneInstance(modelName, modelKey);
        rootState = setSubState(rootState, DELETE_STATE_VALUE, modelName, theInstance.modelKey);
      }
    });
    return rootState;
  }

  function reload(rootState: any, option?: ReloadOption) {
    return !!option && !!option.state ? option.state : rootState;
  }

  const reduxReducer = function (rootState, action) {
    if (!rootState) {
      rootState = {};
    }
    if (registerActionHelper.is(action)) {
      // do register models
      rootState = register(rootState, action.payload);
    } else if (unregisterActionHelper.is(action)) {
      // do unregister models
      rootState = unregister(rootState, action.payload);
    } else if (reloadActionHelper.is(action)) {
      // do reload one model
      rootState = reload(rootState, action.payload);
    }

    //need to find the state reducer or reducer to handler it
    const curAnnCtx = getContext(annoCtxName);
    const actionNames = curAnnCtx.disassembleActionName(action.type);
    if (!!actionNames) {
      const {modelName, key, fieldName} = actionNames;
      const theInstance = curAnnCtx.getOneInstance(modelName, key);
      let theReducer = curAnnCtx.getModelMeta(modelName)?.reducersByFieldName.get(fieldName);
      if (!theReducer && (theInstance.constructor as ImdAnnoConstructor<any>)[REDUCER_KEYS_FIELD].has(fieldName)) {
        theReducer = theInstance[fieldName].bind(theInstance);
      }
      if (!!theInstance && !!theReducer) {
        const theState = getSubState(rootState, modelName, key);
        const newState = theReducer(theState, action.payload);
        return setSubState(rootState, newState, modelName, key);
      } else {
        return rootState;
      }
    } else {
      return rootState;
    }
  } as ReduxReducer;

  return (rootState, action) => {
    getContext(annoCtxName).rootState = rootState;
    rootState = reduxReducer(rootState, action);
    getContext(annoCtxName).rootState = null;
    return rootState;
  };
}
