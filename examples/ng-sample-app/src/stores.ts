import {InjectionToken} from '@angular/core';
import {applyMiddleware, compose, createStore} from 'redux';
import {default as createSagaMiddleware} from 'redux-saga';
import {initReduxAnno} from 'redux-anno';

import {Entry} from 'sample-shared-models';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const annoStore = initReduxAnno({
  entryModel: Entry,
  storeCreator: (reducer, middleware, saga) => {
    const sagaMiddleware = createSagaMiddleware({
      onError(error: Error, errorInfo: any) {
        console.error(error, errorInfo);
      },
    });
    const enhancer = composeEnhancers(applyMiddleware(middleware, sagaMiddleware));
    const store = createStore(reducer, enhancer);
    sagaMiddleware.run(saga);
    return store;
  },
});

export const AppStore = new InjectionToken('App.store');

export const appStoreProvider = [{provide: AppStore, useValue: annoStore.store}];

export default annoStore;
