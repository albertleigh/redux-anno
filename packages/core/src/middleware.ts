import {Middleware} from 'redux';
import IdGenerator from './id';
import {MODEL_TYPE, REDUCER_KEYS_FIELD, STATE_KEYS_FIELD, THUNK_KEYS_FIELD} from './base';
import {UnRegisterOption, unregisterActionHelper, reloadActionHelper, ReloadOption} from './action';
import {instantiate, getContext} from './AnnoContext';
import {isObject} from './utils';

export function createMiddleware(annoCtxName?: string): Middleware {
  const curAnnoCtx = getContext(annoCtxName);

  return (store) => (next) => (action) => {
    function reload(options: ReloadOption) {
      curAnnoCtx.clearInstanceMap();
      // todo clean up instanceByKey
      const rootState = !!options && !!options.state ? options.state : curAnnoCtx.store.getState();

      const unregisterOptions: UnRegisterOption[] = [];
      if (isObject(rootState)) {
        curAnnoCtx.getAllModelMeta().forEach((oneModelMeta) => {
          const modelState = rootState[oneModelMeta.name];
          switch (oneModelMeta.type) {
            case MODEL_TYPE.SINGLETON:
              instantiate(oneModelMeta.modelConstructor);
              break;
            case MODEL_TYPE.PROTOTYPE:
            case MODEL_TYPE.MANUALLY:
              // need to remove those prototype and manually handled state
              Object.keys(modelState)
                .filter((one) => IdGenerator.isId(one))
                .forEach((oneKey) => {
                  unregisterOptions.push({
                    contextName: annoCtxName,
                    modelName: oneModelMeta.name,
                    modelKey: oneKey,
                  });
                });
              break;
          }
        });
      }
      !!unregisterOptions.length && store.dispatch(unregisterActionHelper.create(unregisterOptions));
    }

    if (reloadActionHelper.is(action.type)) {
      reload(action);
    }

    const result = next(action);

    const actionNames = curAnnoCtx.disassembleActionName(action.type);
    if (!!actionNames) {
      const {modelName, key, fieldName} = actionNames;
      const theInstance = curAnnoCtx.getOneInstance(modelName, key);

      if (!!theInstance) {
        const thunkHandler = curAnnoCtx.thunkPromiseByAction.get(action);
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
      }
    }
    return result;
  };
}
