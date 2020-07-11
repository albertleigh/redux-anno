import { Saga as ReduxSaga, StrictEffect } from "@redux-saga/types";
import { all, cancel, fork, spawn, take, takeEvery, takeLatest, takeLeading } from "redux-saga/effects";
import {AnnoConstructor, annoActionMethod, SAGA_TYPE, SAGA_KEYS_FIELD, AnnoInstance} from './base'
import {getContext} from './AnnoContext';
import {ActionHelper, Action, implementActionHelper, registerActionHelper, RegisterOption, unregisterActionHelper, UnRegisterOption, AnyAction} from './action'
import {AnyConstructor, ConstructorArgsType, KeysOfType, notNull} from './utils'

export type SagaField<TPayload = any, TResult = any> =
    ((payload:TPayload) => Generator<StrictEffect,TResult, unknown>) |
    (() => Generator<StrictEffect,TResult, unknown>)
;
export type ExtractSagaFieldPayload<T> =
    T extends ()=>Generator?
        undefined:
    T extends (payload: infer TPayload)=>Generator?
        TPayload:
    undefined;
export type ExtractSagaFieldResult<T> = T extends
    ((payload:any)=>Generator<any,infer TResult, unknown>)|
    (()=>Generator<any,infer TResult, unknown>)
? TResult : unknown;

export function Saga(type:SAGA_TYPE = SAGA_TYPE.TAKE_EVERY) {
    return function<TKey extends string, TTarget extends {[K in TKey]:SagaField}
    > (target: TTarget, propertyKey: TKey, descriptor: PropertyDescriptor) {

        const privateTarget = target as TTarget & {
            constructor: AnnoConstructor<any>,
            __proto__: any,
        }

        if (!privateTarget.constructor.hasOwnProperty(SAGA_KEYS_FIELD)){
            const theNewMap = new Map();
            privateTarget.constructor[SAGA_KEYS_FIELD] = theNewMap;
            // pre populate from __proto__ chain
            let theProto = privateTarget.__proto__
            while (!!theProto){
                if (theProto.constructor?.hasOwnProperty(SAGA_KEYS_FIELD)){
                    for (const [oneKey, oneType] of theProto.constructor[SAGA_KEYS_FIELD]){
                        theNewMap.set(oneKey, oneType);
                    }
                }
                theProto = theProto.__proto__;
            }
        }

        privateTarget.constructor[SAGA_KEYS_FIELD].set(propertyKey, type);
        implementActionHelper(target.constructor as any, propertyKey);
    }
}

export type HasSagas = {[SAGA_KEYS_FIELD]:object};
export type SagaKeys<T extends HasSagas> = keyof T[typeof SAGA_KEYS_FIELD];

export function getSagaProperty<TModel extends HasSagas, TKey extends SagaKeys<TModel>>(model: TModel, key: TKey) {
    return model[key];
}


export type TransformSaga<T extends Object> = {
    [P in keyof T]: T[P] extends SagaField?
        T[P] &
        ActionHelper<ExtractSagaFieldPayload<T[P]>,ExtractSagaFieldResult<T[P]>>
        : T[P]
} & {
    [SAGA_KEYS_FIELD] : Pick<T, KeysOfType<T, SagaField>>
}

export type WithSagas<T extends AnyConstructor> = {
    [K in keyof T]: T[K]
} & {
    new (...args: ConstructorArgsType<T>): TransformSaga<InstanceType<T>>
}

export function withSagas<TModel extends AnyConstructor>(PreWrappedModel: TModel):WithSagas<TModel> {

    const ModelWithSagas = function (this: WithSagas<TModel>) {

        PreWrappedModel.apply(this, arguments as any)

        const self = this as AnnoInstance<any>;
        for (const [sagaKey, sagaType]  of PreWrappedModel.prototype.constructor[SAGA_KEYS_FIELD]){
            self[sagaKey] = function*(arg0:any){
                yield * PreWrappedModel.prototype[sagaKey].bind(self)(arg0)
            }
            self[sagaKey]['type'] = self[annoActionMethod(sagaKey,'type')];
            self[sagaKey]['is'] = self[annoActionMethod(sagaKey,'is')].bind(this);
            self[sagaKey]['create'] = self[annoActionMethod(sagaKey,'create')].bind(this);
            self[sagaKey]['dispatch'] = self[annoActionMethod(sagaKey,'dispatch')].bind(this);
        }
    }
    ModelWithSagas.prototype = PreWrappedModel.prototype;

    return (ModelWithSagas as unknown) as WithSagas<TModel>
}


export function rootSagaBuilder(annoCtxName?:string) {

    // const curAnnoCtx = getContext(annoCtxName);

    function* registerInstance(action: Action<RegisterOption[]>){
        const optionList = !!action.payload? action.payload: [];
        for (const options of optionList){
            const {instance, state} = options;
            if (instance.name === annoCtxName){
                const entryReduxSagas: ReduxSaga[] = [];
                const reduxSagasTakenEvery: ReduxSaga[] = [];
                const reduxSagasTakenLatest: ReduxSaga[] = [];
                const reduxSagasTakenLeading: ReduxSaga[] = [];
                // todo support takeLeading takeLatest over here
                for (const [fieldName, sagaType] of instance.constructor[SAGA_KEYS_FIELD]){
                    switch (sagaType){
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
                    if (sagaType === SAGA_TYPE.AUTO_RUN){
                        entryReduxSagas.push(instance[fieldName])
                    }
                }
                yield spawn(function* (){
                    const allTasks = yield all([
                        entryReduxSagas.map((reduxSaga)=>fork(reduxSaga)),
                        fork(function* (){
                            for (const oneSaga of reduxSagasTakenEvery) {
                                yield takeEvery((oneSaga as any).type, function*(action: any){
                                    yield* oneSaga(action.payload) as any;
                                });
                            }
                            for (const oneSaga of reduxSagasTakenLatest) {
                                yield takeLatest((oneSaga as any).type, function*(action: any){
                                    yield* oneSaga(action.payload) as any;
                                });
                            }
                            for (const oneSaga of reduxSagasTakenLeading) {
                                yield takeLeading((oneSaga as any).type, function*(action: any){
                                    yield* oneSaga(action.payload) as any;
                                });
                            }
                        })
                    ])
                    while (true) {
                        const action = (yield take(unregisterActionHelper.type)) as Action<UnRegisterOption[]>;
                        if (action.payload!.some(
                            (option)=>(
                                annoCtxName == option.contextName &&
                                instance.modelName === option.modelName &&
                                instance.modelKey === option.modelKey
                            )
                        )){
                            break;
                        }
                    }
                    yield all(allTasks.map((task: any) => cancel(task)));
                })
            }
        }
    }

    return function* () {
        yield takeEvery(registerActionHelper.type, registerInstance);
    }
}
