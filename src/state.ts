import {
    DELETE_STATE_VALUE, MODEL_CTX_KEYS_FIELD,
    _InnerStateField, STATE_ADDL_FIELD, STATE_KEYS_FIELD,
    AnnoConstructor, AnnoInstance
} from './base';
import {getContext} from './AnnoContext';
import {Action, implementActionHelper} from './action';
import {
    Nullable, notNull, AnyConstructor, ConstructorArgsType, KeysOfType, isObject,
} from './utils'

export function getSubState(
    baseState: any,
    path: string,
    subPath?: string,
) {
    if (!isObject(baseState)){
        throw new Error('Failed to get sub state from a non-object base state');
    }
    let state = baseState[path];
    if (!subPath){
        return state;
    }
    if (!isObject(state)){
        throw new Error('Failed to get dynamic sub state from a non-object sub state');
    }
    state = state[subPath];
    return state;
}
export function setSubState(
    baseState: any,
    value: any,
    path: string,
    subPath?: string
):any {
    if (!baseState){
        baseState = {};
    }
    if (!isObject(baseState)){
        throw new Error('Failed to set sub state from a non-object base state');
    }

    if (!!subPath){
        const state = setSubState(baseState[path], value, subPath);
        if (baseState[path] === state) {
            return baseState;
        }
        return {
            ...baseState,
            [path]: state
        }
    }else{
        if (baseState[path] === value){
            return baseState;
        }
        baseState = {...baseState};
        if (value === DELETE_STATE_VALUE){
            delete baseState[path];
        }else{
            baseState[path] = value;
        }
        return baseState;
    }

}

export interface IsAnnoStateField {
    [STATE_ADDL_FIELD]: '__anno_state'
}

export type StateField<T = unknown> = T & IsAnnoStateField;

export function createState<TState, TModel extends AnyConstructor = any>( state?:TState):StateField<TState>;
export function createState<TState, TModel extends AnyConstructor = any>(state?:(this:InstanceType<TModel>)=>TState): StateField<TState>;
export function createState<TState, TModel extends AnyConstructor = any>(...args:any[]){
    let innerStateField:  _InnerStateField<TState, TModel>;
    if (typeof args[0] === 'function'){
        innerStateField  = {
            isStateCreator: true,
            state: args[0]
        }
    }else{
        innerStateField  = {
            isStateCreator: false,
            state: args[0]
        }
    }
    return (innerStateField as unknown) as StateField<TState>;
}

/**
 *  State Annotation
 * @param target
 * @param propertyKey
 * @constructor
 */
export function State<
    TKey extends string,
    TTarget extends {[K in TKey]: IsAnnoStateField}
>(target: TTarget, propertyKey:TKey) {

    const privateTarget = target as TTarget & {
        constructor: AnnoConstructor<any>,
        __proto__: any,
    };

    if (!privateTarget.constructor.hasOwnProperty(STATE_KEYS_FIELD)){
        const theNewSet = new Set();
        privateTarget.constructor[STATE_KEYS_FIELD] = theNewSet;
        // pre populate from __proto__ chain
        let theProto = privateTarget.__proto__
        while (!!theProto){
            if (!!theProto.constructor?.hasOwnProperty(STATE_KEYS_FIELD)){
                for (const oneParentStateField of theProto.constructor[STATE_KEYS_FIELD]){
                    theNewSet.add(oneParentStateField);
                }
            }
            theProto = theProto.__proto__;
        }
    }

    privateTarget.constructor[STATE_KEYS_FIELD]!.add(propertyKey);
    implementActionHelper(target.constructor as any, propertyKey);
}

export type HasStates = { [STATE_KEYS_FIELD]: object};
export type StateKeys<T extends HasStates> = keyof T[typeof STATE_KEYS_FIELD];

export function getStateProperty<TModel extends HasStates, TKey extends StateKeys<TModel>>(model: TModel, key:TKey){
    return model[key];
}

export type TransformState<T extends Object> = {
    [P in keyof T]: T[P] extends  StateField<infer A>? A : T[P];
} & {
    [STATE_KEYS_FIELD]: Pick<T, KeysOfType<T, StateField>>
}

export type WithStates<T extends AnyConstructor> = {
    [K in keyof T]: T[K]
} & {
    new (...args: ConstructorArgsType<T>): TransformState<InstanceType<T>>
}

export function withStates<TModel extends AnyConstructor>(PreWrappedModel: TModel):WithStates<TModel> {

    const ModelWithStates = function (this:WithStates<TModel>) {
        // const self = this as AnnoInstance<any>;
        PreWrappedModel.apply(this, arguments as any)
    }
    ModelWithStates.prototype = PreWrappedModel.prototype;

    // Object.defineProperty(ModelWithStates.prototype, "". {})
    return (ModelWithStates as unknown) as WithStates<TModel>;
}
