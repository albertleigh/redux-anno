import {Reducer as ReduxReducer} from 'redux';

import {DELETE_STATE_VALUE, _InnerStateField, STATE_KEYS_FIELD, REDUCER_KEYS_FIELD, AsImdAnnoInst} from './base';
import {getContext} from './AnnoContext';
import {
  RegisterOption,
  registerActionHelper,
  UnRegisterOption,
  unregisterActionHelper,
  reloadActionHelper,
  ReloadOption,
  implementActionHelper,
} from './action';
import {getSubState, setSubState, ModelSates} from './state';
import {prePopulateSetFieldViaPrototype, Proto} from './utils';

export type ReducerField<TModel extends any, TPayload> = ModelReducer<ModelSates<TModel>, TPayload>;
export type ExtractReducerFieldPayload<T> = T extends (state: any, payload: infer _TPayload) => void
  ? _TPayload
  : undefined;
export function Reducer<TModel extends any>() {
  return function <
    TKey extends string,
    TTarget extends {
      [K in TKey]: TTarget[K] extends ReducerField<TModel, infer TPayload> ? ReducerField<TModel, TPayload> : void;
    } &
      TModel
  >(target: TTarget, propertyKey: TKey) {
    const privateTarget = target as Proto<TTarget>;
    prePopulateSetFieldViaPrototype(target as Proto<TTarget>, REDUCER_KEYS_FIELD);
    privateTarget.constructor[REDUCER_KEYS_FIELD]!.add(propertyKey);
    implementActionHelper(target.constructor as any, propertyKey);
  };
}

export type ModelReducer<TState extends Record<string | number, unknown> = any, TPayload = any> = (
  previousState: TState,
  payload: TPayload
) => TState;

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
          // intercept the set/get of that field for the instance
          Object.defineProperty(instance, stateKey, {
            set(value: any) {
              const self = this as AsImdAnnoInst<any>;
              getContext(self.contextName).store?.dispatch({
                type: getContext(self.contextName).assembleActionName(self.modelName, stateKey, self.modelKey),
                payload: value,
              });
            },
            get(): any {
              const self = this as any;
              return getSubState(getContext(self.contextName).store.getState(), self.modelName, self.modelKey)?.[
                stateKey
              ];
            },
            enumerable: true,
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
      const theReducer = curAnnCtx.getModelMeta(modelName)?.reducersByFieldName.get(fieldName);
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
