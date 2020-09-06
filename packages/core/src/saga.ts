import {Saga as ReduxSaga, StrictEffect} from '@redux-saga/types';
import {getContext} from './AnnoContext';
import {all, cancel, fork, spawn, take, takeEvery, takeLatest, takeLeading} from 'redux-saga/effects';
import {annoActionMethod, SAGA_TYPE, SAGA_KEYS_FIELD, AsImdAnnoInst} from './base';
import {
  ActionHelper,
  Action,
  implementActionHelper,
  registerActionHelper,
  RegisterOption,
  unregisterActionHelper,
  UnRegisterOption,
} from './action';
import {AnyClass, KeysOfType, Proto, prePopulateMapFieldViaPrototype} from './utils';

export type SagaField<TPayload = any, TResult = any> =
  | ((payload: TPayload) => Generator<StrictEffect | any, TResult>)
  | (() => Generator<StrictEffect | any, TResult>);
export type ExtractSagaFieldPayload<T> = T extends () => Generator
  ? undefined
  : T extends (payload: infer _TPayload) => Generator
  ? _TPayload
  : undefined;
export type ExtractSagaFieldResult<T> = T extends
  | ((payload: any) => Generator<any, infer _TResult>)
  | (() => Generator<any, infer _TResult>)
  ? _TResult
  : unknown;

export function Saga(type: SAGA_TYPE = SAGA_TYPE.TAKE_EVERY) {
  return function <TKey extends string, TTarget extends {[K in TKey]: SagaField}>(
    target: TTarget,
    propertyKey: TKey
    // descriptor: PropertyDescriptor
  ) {
    const privateTarget = target as Proto<TTarget>;
    prePopulateMapFieldViaPrototype(privateTarget, SAGA_KEYS_FIELD);

    privateTarget.constructor[SAGA_KEYS_FIELD].set(propertyKey, type);
    implementActionHelper(target.constructor as any, propertyKey);
  };
}

export type TransformSaga<T extends Record<string | number, any>> = {
  [P in keyof T]: T[P] extends SagaField
    ? T[P] & ActionHelper<ExtractSagaFieldPayload<T[P]>, ExtractSagaFieldResult<T[P]>>
    : T[P];
} & {
  [SAGA_KEYS_FIELD]: Pick<T, KeysOfType<T, SagaField>>;
};

export type WithSagas<T extends AnyClass> = {
  [K in keyof T]: T[K];
} & {
  new (...args: ConstructorParameters<T>): TransformSaga<InstanceType<T>>;
};

export function withSagas<TModel extends AnyClass>(PreWrappedModel: TModel): WithSagas<TModel> {
  const ModelWithSagas = function (this: WithSagas<TModel>) {
    PreWrappedModel.apply(this, arguments as any);

    const self = this as AsImdAnnoInst<any>;
    for (const [sagaKey /*, sagaType*/] of PreWrappedModel.prototype.constructor[SAGA_KEYS_FIELD]) {
      self[sagaKey] = function* (arg0: any) {
        return yield* PreWrappedModel.prototype[sagaKey].bind(self)(arg0);
      };
      self[sagaKey]['type'] = self[annoActionMethod(sagaKey, 'type')];
      self[sagaKey]['is'] = self[annoActionMethod(sagaKey, 'is')].bind(this);
      self[sagaKey]['create'] = self[annoActionMethod(sagaKey, 'create')].bind(this);
      self[sagaKey]['dispatch'] = self[annoActionMethod(sagaKey, 'dispatch')].bind(this);
    }
  };
  ModelWithSagas.prototype = PreWrappedModel.prototype;

  return (ModelWithSagas as unknown) as WithSagas<TModel>;
}

export type HasSagas = {[SAGA_KEYS_FIELD]: any};
export type SagaKeys<T extends HasSagas> = keyof T[typeof SAGA_KEYS_FIELD];

export function getSagaProperty<TModel extends HasSagas, TKey extends SagaKeys<TModel>>(model: TModel, key: TKey) {
  return model[key];
}

function* sagaFieldWrapper(annoCtxName: string | undefined, oneSaga: ReduxSaga, action: any) {
  const curAnnoCtx = getContext(annoCtxName);
  const thunkHandler = curAnnoCtx.thunkPromiseByAction.get(action);
  let res, rej;
  try {
    res = yield* oneSaga(action.payload) as any;
  } catch (e) {
    rej = e;
  }
  if (!!rej) {
    thunkHandler?.reject(rej);
    throw rej;
  } else {
    thunkHandler?.resolve(res);
    return res;
  }
}

export function rootSagaBuilder(annoCtxName?: string) {
  function* registerInstance(action: Action<RegisterOption[]>) {
    const optionList = !!action.payload ? action.payload : [];
    for (const options of optionList) {
      const {instance} = options;
      if ((!instance.contextName && !annoCtxName) || instance.contextName === annoCtxName) {
        const entryReduxSagas: ReduxSaga[] = [];
        const reduxSagasTakenEvery: ReduxSaga[] = [];
        const reduxSagasTakenLatest: ReduxSaga[] = [];
        const reduxSagasTakenLeading: ReduxSaga[] = [];
        // todo support takeLeading takeLatest over here
        for (const [fieldName, sagaType] of instance.constructor[SAGA_KEYS_FIELD]) {
          switch (sagaType) {
            case SAGA_TYPE.AUTO_RUN:
              entryReduxSagas.push(instance[fieldName]);
              break;
            case SAGA_TYPE.TAKE_EVERY:
              reduxSagasTakenEvery.push(instance[fieldName]);
              break;
            case SAGA_TYPE.TAKE_LATEST:
              reduxSagasTakenLatest.push(instance[fieldName]);
              break;
            case SAGA_TYPE.TAKE_LEADING:
              reduxSagasTakenLeading.push(instance[fieldName]);
              break;
          }
          if (sagaType === SAGA_TYPE.AUTO_RUN) {
            entryReduxSagas.push(instance[fieldName]);
          }
        }
        yield spawn(function* () {
          const allTasks = yield all([
            entryReduxSagas.map((reduxSaga) => fork(reduxSaga)),
            fork(function* () {
              for (const oneSaga of reduxSagasTakenEvery) {
                yield takeEvery((oneSaga as any).type, sagaFieldWrapper.bind(instance, annoCtxName, oneSaga));
              }
              for (const oneSaga of reduxSagasTakenLatest) {
                yield takeLatest((oneSaga as any).type, sagaFieldWrapper.bind(instance, annoCtxName, oneSaga));
              }
              for (const oneSaga of reduxSagasTakenLeading) {
                yield takeLeading((oneSaga as any).type, sagaFieldWrapper.bind(instance, annoCtxName, oneSaga));
              }
            }),
          ]);
          while (true) {
            const action = (yield take(unregisterActionHelper.type)) as Action<UnRegisterOption[]>;
            if (
              action.payload!.some(
                (option) =>
                  annoCtxName == option.contextName &&
                  instance.modelName === option.modelName &&
                  instance.modelKey === option.modelKey
              )
            ) {
              break;
            }
          }
          yield all(allTasks.map((task: any) => cancel(task)));
        });
      }
    }
  }

  return function* () {
    yield takeEvery(registerActionHelper.type, registerInstance);
  };
}
