import {applyMiddleware, compose, createStore} from 'redux';
import {default as createSagaMiddleware} from 'redux-saga';
import {initReduxAnno} from 'redux-anno';

import Entry from './Entry';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default initReduxAnno({
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
