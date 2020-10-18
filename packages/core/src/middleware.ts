import {Middleware} from 'redux';
import IdGenerator from './id';
import {MODEL_TYPE, REDUCER_KEYS_FIELD, STATE_KEYS_FIELD, THUNK_KEYS_FIELD, WATCHED_KEYS_FIELD} from './base';
import {reloadActionHelper, ReloadOption} from './action';
import {instantiate, getContext} from './AnnoContext';
import {isObject} from './utils';

export function createMiddleware(annoCtxName?: string): Middleware {
  const curAnnoCtx = getContext(annoCtxName);

  return (_store) => (next) => (action) => {
    function reload(options: ReloadOption | undefined) {
      const rootState = !!options && !!options.state ? options.state : curAnnoCtx.store.getState();
      curAnnoCtx.clearInstanceMap();
      if (isObject(rootState)) {
        curAnnoCtx.getAllModelMeta().forEach((oneModelMeta) => {
          const modelState = rootState[oneModelMeta.name];
          switch (oneModelMeta.type) {
            case MODEL_TYPE.SINGLETON:
              // instancing the singleton
              if (!!modelState) {
                instantiate(oneModelMeta.modelConstructor, [], modelState, annoCtxName);
              }
              break;
            case MODEL_TYPE.PROTOTYPE:
              // need to remove those prototype and manually handled state
              Object.keys(modelState)
                .filter((one) => IdGenerator.isId(one))
                .forEach((oneKey) => {
                  instantiate(oneModelMeta.modelConstructor, [], modelState[oneKey], annoCtxName, oneKey);
                });
              break;
            case MODEL_TYPE.MANUALLY:
              // todo decide it is singleton or prototype
              if (Object.keys(modelState).some((one) => IdGenerator.isId(one))) {
                Object.keys(modelState)
                  .filter((one) => IdGenerator.isId(one))
                  .forEach((oneKey) => {
                    instantiate(oneModelMeta.modelConstructor, [], modelState[oneKey], annoCtxName, oneKey);
                  });
              } else {
                if (!!modelState) {
                  instantiate(oneModelMeta.modelConstructor, [], modelState, annoCtxName);
                }
              }
              break;
          }
        });
      }
    }

    if (reloadActionHelper.is(action)) {
      reload(action.payload);
    }

    const result = next(action);

    const actionNames = curAnnoCtx.disassembleActionName(action.type);
    if (!!actionNames) {
      const {modelName, key, fieldName} = actionNames;
      const theInstance = curAnnoCtx.getOneInstance(modelName, key);

      if (!!theInstance) {
        const thunkHandler = curAnnoCtx.thunkPromiseByAction.get(action);
        const modelMeta = curAnnoCtx.getModelMeta(theInstance.modelName);

        if ((theInstance.constructor as any)[THUNK_KEYS_FIELD].has(fieldName)) {
          theInstance[fieldName](action.payload).then(
            (res: any) => {
              thunkHandler?.resolve(res);
            },
            (rej: any) => {
              thunkHandler?.reject(rej);
            }
          );
        } else if (
          (theInstance.constructor as any)[STATE_KEYS_FIELD].has(fieldName) ||
          (theInstance.constructor as any)[REDUCER_KEYS_FIELD].has(fieldName)
        ) {
          thunkHandler?.resolve(void 0);
        }

        // might need to update the computed fields
        if (
          (theInstance.constructor as any)[STATE_KEYS_FIELD].has(fieldName) ||
          (theInstance.constructor as any)[WATCHED_KEYS_FIELD].has(fieldName)
        ) {
          modelMeta?.watchedStateDependenciesHelper.computeFieldsIfNeeded(fieldName, theInstance);
        }
      }
    }
    return result;
  };
}
