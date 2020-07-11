import {Middleware} from 'redux'
import IdGenerator from './id';
import {MODEL_TYPE} from './base'
import {
    RegisterOption,
    registerActionHelper,
    UnRegisterOption,
    unregisterActionHelper,
    reloadActionHelper,
    ReloadOption
} from './action';
import { instantiate, getContext} from './AnnoContext'
import {isObject} from './utils'

export function createMiddleware(annoCtxName?: string):Middleware {

    const curAnnoCtx = getContext(annoCtxName);

    return (store)=>(next)=>(action)=>{

        function reload(options: ReloadOption){
            curAnnoCtx.clearInstanceMap();
            // todo clean up instanceByKey
            const rootState = !!options && !!options.state ? options.state : curAnnoCtx.store.getState();

            const unregisterOptions: UnRegisterOption[] = [];
            if (isObject(rootState)){
                curAnnoCtx.getAllModelMeta().forEach(oneModelMeta => {
                    const modelState = rootState[oneModelMeta.name];
                    switch (oneModelMeta.type){
                        case MODEL_TYPE.SINGLETON:
                            instantiate(oneModelMeta.modelConstructor);
                            break;
                        case MODEL_TYPE.PROTOTYPE:
                        case MODEL_TYPE.MANUALLY:
                            // need to remove those prototype and manually handled state
                            Object.keys(modelState).filter(one => IdGenerator.isId(one)).forEach(oneKey=>{
                                unregisterOptions.push({
                                    contextName: annoCtxName,
                                    modelName: oneModelMeta.name,
                                    modelKey: oneKey
                                })
                            })
                            break;
                    }
                })
            }
            !!unregisterOptions.length && store.dispatch(unregisterActionHelper.create(unregisterOptions));
        }

        if (reloadActionHelper.is(action.type)){
            reload(action);
        }

        const result = next(action);

        const actionNames = curAnnoCtx.disassembleActionName(action.type);
        if (!!actionNames){
            const { modelName, key, fieldName } = actionNames;
            const instance = curAnnoCtx.getOneInstance(modelName, key);

            if (!!instance){
                const thunkHandler = curAnnoCtx.thunkByAction.get(action);
                // todo handle thunk and filter out sagas
                thunkHandler?.resolve(undefined);
            }
        }
        return result;
    }
}
