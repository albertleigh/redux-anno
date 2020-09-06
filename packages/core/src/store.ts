import {applyMiddleware, createStore, Middleware, Reducer, Store} from 'redux';

import {Saga} from '@redux-saga/types';
import {default as createSagaMiddleware} from 'redux-saga';

import {reloadActionHelper} from './action';
import {createReduxReducer} from './reducer';
import {rootSagaBuilder} from './saga';
import {createMiddleware} from './middleware';
import {getContext, instantiate} from './AnnoContext';
import {AnyClass} from './utils';

export interface AnnoContextOption {
  entryModel: AnyClass | string;
  reduxInitialState?: any;
  constructorArgs?: any[];
  storeCreator?: (reducer: Reducer, middleware: Middleware, saga: Saga) => Store;
  // todo implement these
  dependencies?: any;
  separator?: string;
  onUnhandledError?: (error: any, promise: Promise<any> | undefined) => void;
}

export interface AnnoStoreOptions extends AnnoContextOption {
  contexts?: {[key: string]: AnnoContextOption};
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

export interface ReduxAnnoStore extends ReduxAnnoStoreContext {
  contexts?: {[key: string]: ReduxAnnoStoreContext};
}

function initOneReduxAnnoContext(annoCtxName: string | undefined, option: AnnoContextOption): ReduxAnnoStoreContext {
  const {entryModel, reduxInitialState, constructorArgs, storeCreator} = option;

  const rootReducer = createReduxReducer(annoCtxName);
  const theAnnoCtx = getContext(annoCtxName);
  const middleware = createMiddleware(annoCtxName);

  if (!!storeCreator) {
    theAnnoCtx.store = storeCreator(rootReducer, middleware, rootSagaBuilder(annoCtxName));
  } else {
    const sagaMiddleware = createSagaMiddleware();

    const enhancer = applyMiddleware(middleware, sagaMiddleware);

    theAnnoCtx.store = createStore(rootReducer, enhancer);
    sagaMiddleware.run(rootSagaBuilder(annoCtxName));
  }

  instantiate(entryModel, constructorArgs, reduxInitialState, annoCtxName);
  return {
    store: theAnnoCtx.store,
    reload: (state) => {
      theAnnoCtx.store.dispatch(reloadActionHelper.create({state}));
    },
  };
}

export function initReduxAnno(option: AnnoStoreOptions): ReduxAnnoStore {
  // create root anno
  const result: ReduxAnnoStore = initOneReduxAnnoContext(undefined, option);

  // create sub ctx anno
  if (!!option.contexts) {
    const subCtx: {[key: string]: ReduxAnnoStoreContext} = {};
    for (const [oneCtxName, oneCtxOpt] of Object.entries(option.contexts)) {
      subCtx[oneCtxName] = initOneReduxAnnoContext(oneCtxName, oneCtxOpt);
    }
    result.contexts = subCtx;
  }
  return result;
}
