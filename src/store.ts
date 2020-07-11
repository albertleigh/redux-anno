import {
    applyMiddleware,
    createStore,
    Middleware,
    Reducer,
    Store,
} from "redux";

import { Saga } from "@redux-saga/types";
import { default as createSagaMiddleware } from "redux-saga";

import {registerActionHelper, reloadActionHelper} from './action';
import {createReduxReducer} from './reducer'
import {rootSagaBuilder} from './saga';
import {createMiddleware} from './middleware';
import {getContext, instantiate} from './AnnoContext';
import {AnyConstructor} from "./utils";

export interface AnnoContextOption{
    entryModel: AnyConstructor|string,
    reduxInitialState?: any,
    constructorArgs?: any[];
    // todo implement these
    dependencies?: any;
    separator?:string;
    createStore?: (params: {
        reducer: Reducer;
        middleware: Middleware;
        saga: Saga;
    }) => Store;
    onUnhandledError?: (
        error: any,
        promise: Promise<any> | undefined
    ) => void;
}


export interface AnnoStoreOptions extends AnnoContextOption{
    contexts?:{[key:string]:AnnoContextOption}
}

/**
 * The context returned to the client user
 */
export interface ReduxAnnoStoreContext {
    store: Store;
    // registerModels: (models: Models) => void;
    // getContainer: GetContainer;
    // getState: GetState;
    reload: (state?: any) => void;
    // gc: (filterFn?: (container: Container) => boolean) => void;
}

export interface ReduxAnnoStore extends ReduxAnnoStoreContext{
    contexts?:{[key:string]: ReduxAnnoStoreContext}
}

function initOneReduxAnnoContext(annoCtxName:string | undefined,option:AnnoContextOption ):ReduxAnnoStoreContext{
    const {entryModel, reduxInitialState, constructorArgs} = option;

    const rootReducer = createReduxReducer(annoCtxName);
    const middleware = createMiddleware(annoCtxName);
    const sagaMiddleware = createSagaMiddleware();

    const enhancer = applyMiddleware(middleware, sagaMiddleware);

    const theAnnoCtx = getContext(annoCtxName);

    theAnnoCtx.store  = createStore(rootReducer, enhancer);
    sagaMiddleware.run(rootSagaBuilder());

    // todo do toposort and validate the acyclic dynamic dependencies chain

    instantiate(entryModel, constructorArgs, reduxInitialState, annoCtxName);

    return {
        store: theAnnoCtx.store,
        reload: state => {
            theAnnoCtx.store.dispatch(reloadActionHelper.create({state}))
        }
    }
}

export function initReduxAnno(option:AnnoStoreOptions):ReduxAnnoStore {

    // create root anno
    const result:ReduxAnnoStore = initOneReduxAnnoContext(undefined,option);

    // create sub ctx anno
    if (!!option.contexts){
        const subCtx:{[key:string]: ReduxAnnoStoreContext} = {};
        for (const [oneCtxName, oneCtxOpt] of Object.entries(option.contexts)){
            subCtx[oneCtxName] = initOneReduxAnnoContext(oneCtxName, oneCtxOpt);
        }
        result.contexts = subCtx;
    }
    return result;
}
