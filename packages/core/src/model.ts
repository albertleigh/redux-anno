import {
  AnnoInstanceBase,
  ImdAnnoConstructor,
  MODEL_TYPE,
  MODEL_NAME_FIELD,
  MODEL_TYPE_FIELD,
  MODEL_SELF_KEYS_FIELD,
  STATE_KEYS_FIELD,
  REDUCER_KEYS_FIELD,
  WATCHED_KEYS_FIELD,
  THUNK_KEYS_FIELD,
  SAGA_KEYS_FIELD,
  INSTANCE_KEYS_FIELD,
} from './base';
import {ActionHelper} from './action';
import {AnyClass, prePopulateMapFieldViaPrototype, Proto} from './utils';
import {ThunkField, ExtractThunkFieldPayload, ExtractThunkFieldResult} from './thunk';
import {SagaField, ExtractSagaFieldPayload, ExtractSagaFieldResult} from './saga';
import {Instanced} from './instanced';
import {ModelMeta, getContext} from './AnnoContext';
import {DuplicatedModelFound} from './errors';

type ModelSelfImplType<TModel extends AnyClass> = {
  [P in keyof InstanceType<TModel>]: InstanceType<TModel>[P] extends ThunkField
    ? ActionHelper<ExtractThunkFieldPayload<InstanceType<TModel>[P]>, ExtractThunkFieldResult<InstanceType<TModel>[P]>>
    : InstanceType<TModel>[P] extends SagaField
    ? ActionHelper<ExtractSagaFieldPayload<InstanceType<TModel>[P]>, ExtractSagaFieldResult<InstanceType<TModel>[P]>>
    : never;
};
export type ModelSelfType<TModel extends AnyClass> = ModelSelfImplType<TModel> & AnnoInstanceBase;
export function Self<TKey extends string, TTarget extends {[K in TKey]: ModelSelfType<any>}>(
  target: TTarget,
  propertyKey: TKey
) {
  const privateTarget = target as Proto<TTarget>;
  prePopulateMapFieldViaPrototype(target as Proto<TTarget>, MODEL_SELF_KEYS_FIELD);
  privateTarget.constructor[MODEL_SELF_KEYS_FIELD]!.set(propertyKey, privateTarget.constructor);
}
export function createSelf<TModel extends AnyClass>(model: TModel): ModelSelfType<TModel> {
  return ({model} as unknown) as ModelSelfType<TModel>;
}

function prePopulateConstructorSetField(constructor: AnyClass & any, fieldName: string) {
  if (!constructor.hasOwnProperty(fieldName)) {
    const theNewStateSet = new Set();
    constructor[fieldName] = theNewStateSet;
    let parentConstructor = constructor.__proto__;
    while (!!parentConstructor) {
      if (parentConstructor.hasOwnProperty(fieldName)) {
        for (const oneParentStateField of parentConstructor[fieldName]) {
          theNewStateSet.add(oneParentStateField);
        }
      }
      parentConstructor = parentConstructor.__proto__;
    }
  }
}

function prePopulateConstructorMapField(constructor: AnyClass & any, fieldName: string) {
  if (!constructor.hasOwnProperty(fieldName)) {
    const theNewStateMap = new Map();
    constructor[fieldName] = theNewStateMap;
    let parentConstructor = constructor.__proto__;
    while (!!parentConstructor) {
      if (parentConstructor.hasOwnProperty(fieldName)) {
        for (const [oneKey, oneVal] of parentConstructor[fieldName]) {
          theNewStateMap.set(oneKey, oneVal);
        }
      }
      parentConstructor = parentConstructor.__proto__;
    }
  }
}

export function Model(type: MODEL_TYPE = MODEL_TYPE.SINGLETON, modelName?: string) {
  return function (constructor: AnyClass) {
    const InstancedConstructor = Instanced(constructor);
    const _constructor = constructor as ImdAnnoConstructor<typeof constructor> & any;
    _constructor[MODEL_NAME_FIELD] = !!modelName ? modelName : constructor.name;
    _constructor[MODEL_TYPE_FIELD] = type;

    // what if gotta mod w/o state, better populate con state fields in advance
    prePopulateConstructorSetField(_constructor, STATE_KEYS_FIELD);
    // what if gotta mod w/o reducer, better populate con reducer fields in advance
    prePopulateConstructorSetField(_constructor, REDUCER_KEYS_FIELD);
    // what if gotta mod w/o reducer, better populate con watched fields in advance
    prePopulateConstructorSetField(_constructor, WATCHED_KEYS_FIELD);
    // what if gotta mod w/o thunk, better populate con thunk fields in advance
    prePopulateConstructorSetField(_constructor, THUNK_KEYS_FIELD);
    // what if gotta mod w/o saga, better populate con saga fields in advance
    prePopulateConstructorMapField(_constructor, SAGA_KEYS_FIELD);
    // what if gotta mod w/o instance, better populate con instance fields in advance
    prePopulateConstructorSetField(_constructor, INSTANCE_KEYS_FIELD);
    // what if gotta mod w/o self, better populate con instance fields in advance
    prePopulateConstructorMapField(_constructor, MODEL_SELF_KEYS_FIELD);

    // -------------------------------------------------------------------------------------------------------------
    // register on the default ctx w/ mgr
    const defaultAnnoCtx = getContext();
    const theModelName = modelName || constructor.name;
    // todo check duplicate modelName exist
    const histModelName = defaultAnnoCtx.getModelMeta(theModelName);
    if (!!histModelName) {
      throw new DuplicatedModelFound(
        `Failed to register the model with the name of ${theModelName} which already exists`
      );
    }
    const theModelMeta = new ModelMeta(type, theModelName, constructor, InstancedConstructor);
    const reducersByFieldName = theModelMeta.reducersByFieldName;
    // populate the reducers for the model meta
    for (const stateKey of new Set([..._constructor[STATE_KEYS_FIELD], ..._constructor[WATCHED_KEYS_FIELD]])) {
      reducersByFieldName.set(stateKey, (previousState, payload) => ({
        ...previousState,
        [stateKey]: payload,
      }));
    }
    defaultAnnoCtx.registerModel(constructor, InstancedConstructor, theModelMeta);
  };
}
