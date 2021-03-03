import {Saga as ReduxSaga, StrictEffect} from '@redux-saga/types';
import {getContext} from './AnnoContext';
import {all, cancel, fork, spawn, put, take, takeEvery, takeLatest, takeLeading} from 'redux-saga/effects';
import {annoActionMethod, AsImdAnnoInst, SAGA_KEYS_FIELD, SAGA_TYPE, SagaKeysField, WATCHED_KEYS_FIELD} from './base';
import {
  Action,
  ActionHelper,
  implementActionHelper,
  registerActionHelper,
  RegisterOption,
  unregisterActionHelper,
  UnRegisterOption,
} from './action';
import {AnyClass, KeysOfType, prePopulateMapFieldViaPrototype, Proto} from './utils';

export type SagaField<TPayload = any, TResult = any> =
  | ((payload: TPayload) => Generator<StrictEffect | any, TResult>)
  | (() => Generator<StrictEffect | any, TResult>);
export type ExtractSagaFieldPayload<T> = T extends (...args: infer _APayload) => Generator ? _APayload[0] : never;
export type ExtractSagaFieldResult<T> = T extends
  | ((payload: any) => Generator<any, infer _TResult>)
  | (() => Generator<any, infer _TResult>)
  ? _TResult
  : unknown;

export function Saga(type: SAGA_TYPE = SAGA_TYPE.TAKE_EVERY, customActionType: string | undefined = undefined) {
  return function <TKey extends string, TTarget extends {[K in TKey]: SagaField}>(
    target: TTarget,
    propertyKey: TKey
    // descriptor: PropertyDescriptor
  ) {
    const privateTarget = target as Proto<TTarget>;
    prePopulateMapFieldViaPrototype(privateTarget, SAGA_KEYS_FIELD);

    privateTarget.constructor[SAGA_KEYS_FIELD].set(propertyKey, {type, customActionType});
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
        const customReduxSagas: {reduxSaga: ReduxSaga; type: SAGA_TYPE; customActionType: string}[] = [];
        // todo support takeLeading takeLatest over here
        for (const [fieldName, sagaKeysField] of instance.constructor[SAGA_KEYS_FIELD]) {
          const sagaType = (sagaKeysField as SagaKeysField).type;
          const customActionType = (sagaKeysField as SagaKeysField).customActionType;
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
          if (!!customActionType && sagaType != SAGA_TYPE.AUTO_RUN) {
            customReduxSagas.push({
              reduxSaga: instance[fieldName],
              type: sagaType,
              customActionType,
            });
          }
        }
        yield spawn(function* () {
          const allTasks = yield all([
            ...entryReduxSagas.map((reduxSaga) => fork([instance, reduxSaga])),
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
              for (const {reduxSaga, type, customActionType} of customReduxSagas) {
                switch (type) {
                  case SAGA_TYPE.TAKE_EVERY:
                    yield takeEvery(customActionType, reduxSaga.bind(instance));
                    break;
                  case SAGA_TYPE.TAKE_LATEST:
                    yield takeLatest(customActionType, reduxSaga.bind(instance));
                    break;
                  case SAGA_TYPE.TAKE_LEADING:
                    yield takeLeading(customActionType, reduxSaga.bind(instance));
                    break;
                  default:
                    break;
                }
              }
            }),
          ]);
          while (true) {
            const action = (yield take(unregisterActionHelper.type)) as Action<UnRegisterOption[]>;
            if (
              action.payload!.some(
                (option) =>
                  ((!annoCtxName && !option.contextName) || annoCtxName == option.contextName) &&
                  instance.modelName === option.modelName &&
                  ((!instance.modelKey && !option.modelKey) || instance.modelKey === option.modelKey)
              )
            ) {
              break;
            }
          }
          yield all(allTasks.map((task: any) => cancel(task)));
        });
        for (const computedField of instance.constructor[WATCHED_KEYS_FIELD]) {
          yield put(
            instance[annoActionMethod(computedField, 'create')](
              (instance[computedField] as any).creator.apply(instance, [])
            )
          );
        }
      }
    }
  }

  return function* () {
    yield takeEvery(registerActionHelper.type, registerInstance);
  };
}
