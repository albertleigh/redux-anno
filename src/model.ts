import {
    AnnoConstructor,
    MODEL_TYPE, MODEL_NAME_FIELD, MODEL_TYPE_FIELD, MODEL_CTX_KEYS_FIELD, STATE_KEYS_FIELD, SAGA_KEYS_FIELD, INSTANCE_KEYS_FIELD,
} from './base'
import {ActionHelper} from './action'
import {
    AnyConstructor, ConstructorArgsType, KeysOfType, notNull,
} from './utils'
import {StateField} from './state';
import {SagaField, ExtractSagaFieldPayload, ExtractSagaFieldResult} from './saga'
import {Instanced} from './instanced'
import {ModelMeta, getContext} from './AnnoContext';
import {DuplicatedModelFound} from './errors';

export function ModelContext<
    TKey extends string,
    TTarget extends {[K in TKey]: ModelContextType<any>}
>(target: TTarget, propertyKey:TKey){
    const privateTarget = target as TTarget & {
        constructor: AnnoConstructor<any>,
        __proto__: any,
    };

    if (!privateTarget.constructor.hasOwnProperty(MODEL_CTX_KEYS_FIELD)){
        const theNewSet = new Set();
        privateTarget.constructor[MODEL_CTX_KEYS_FIELD] = theNewSet;
        let theProto = privateTarget.__proto__
        while (!!theProto){
            if (theProto.constructor?.hasOwnProperty(MODEL_CTX_KEYS_FIELD)){
                for (const oneParentCtxField of theProto.constructor[MODEL_CTX_KEYS_FIELD]){
                    theNewSet.add(oneParentCtxField);
                }
            }
            theProto = theProto.__proto__;
        }
    }

    privateTarget.constructor[MODEL_CTX_KEYS_FIELD]!.add(propertyKey);
}
export type ModelContextType<TModel extends AnyConstructor> = {
    [P in keyof InstanceType<TModel>] :
        InstanceType<TModel>[P] extends StateField<infer F> ?
            ActionHelper<F, void>
        : InstanceType<TModel>[P] extends SagaField?
            ActionHelper<ExtractSagaFieldPayload<InstanceType<TModel>[P]>,ExtractSagaFieldResult<InstanceType<TModel>[P]>>
        : unknown;
}
export function createModelContext<TModel extends AnyConstructor>(model:TModel):ModelContextType<TModel> {
    return ({model} as unknown) as ModelContextType<TModel>;
}

function prePopulateConstructorSetField(constructor:AnyConstructor & any, fieldName:string){
    if (!constructor.hasOwnProperty(fieldName)){
        const theNewStateSet = new Set();
        constructor[fieldName] = theNewStateSet;
        let parentConstructor = constructor.__proto__;
        while(!!parentConstructor){
            if (parentConstructor.hasOwnProperty(fieldName)){
                for (const oneParentStateField of parentConstructor[fieldName]){
                    theNewStateSet.add(oneParentStateField);
                }
            }
            parentConstructor = parentConstructor.__proto__;
        }
    }
}

function prePopulateConstructorMapField(constructor:AnyConstructor & any, fieldName:string){
    if (!constructor.hasOwnProperty(fieldName)){
        const theNewStateMap = new Map();
        constructor[fieldName] = theNewStateMap;
        let parentConstructor = constructor.__proto__;
        while(!!parentConstructor){
            if (parentConstructor.hasOwnProperty(fieldName)){
                for (const [oneKey, oneVal] of parentConstructor[fieldName]){
                    theNewStateMap.set(oneKey, oneVal);
                }
            }
            parentConstructor = parentConstructor.__proto__;
        }
    }
}

export function Model(type:MODEL_TYPE = MODEL_TYPE.SINGLETON, modelName?:string){
    return function (constructor: AnyConstructor) {
        const InstancedConstructor = Instanced(constructor);
        const _constructor = constructor as AnnoConstructor<typeof constructor> & any;
        _constructor[MODEL_NAME_FIELD] = !!modelName? modelName : constructor.name;
        _constructor[MODEL_TYPE_FIELD] = type;

        // what if gotta mod w/o state, better populate con state fields in advance
        prePopulateConstructorSetField(_constructor, STATE_KEYS_FIELD);
        // what if gotta mod w/o saga, better populate con saga fields in advance
        prePopulateConstructorMapField(_constructor, SAGA_KEYS_FIELD);
        // what if gotta mod w/o instance, better populate con instance fields in advance
        prePopulateConstructorSetField(_constructor, INSTANCE_KEYS_FIELD);

        // -------------------------------------------------------------------------------------------------------------
        // register on the default ctx w/ mgr
        const defaultAnnoCtx = getContext();
        const theModelName = modelName || constructor.name;
        // todo check duplicate modelName exist
        const histModelName = defaultAnnoCtx.getModelMeta(theModelName);
        if (!!histModelName){
            throw new DuplicatedModelFound(`Failed to register the model with the name of ${theModelName} which already exists`);
        }
        const theModelMeta = new ModelMeta(type, theModelName, constructor, InstancedConstructor);
        const reducersByFieldName = theModelMeta.reducersByFieldName;
        // populate the reducers for the model meta
        for (const stateKey of _constructor[STATE_KEYS_FIELD]){
            reducersByFieldName.set(
                stateKey,
                (previousState, payload)=>({
                    ...previousState,
                    [stateKey]: payload,
                })
            )
        }
        defaultAnnoCtx.registerModel(
            constructor,
            InstancedConstructor,
            theModelMeta
        );
    }
}
