import {ACTION_FIELD_PREFIX, annoActionMethod, AnnoConstructor, AnnoInstance} from './base';
import {AnyConstructor, notNull} from './utils'
import {getContext} from "./AnnoContext";

export interface AnyAction {
    type: string;
    payload: any;
}

export interface Action<TPayload = any> {
    type: string,
    payload?: TPayload,
}


export interface FullActionHelper<TPayload = any, TResult = any> {
    type: string,
    is(action:any): action is Action<TPayload>,
    create(payload:TPayload): Action<TPayload>,
    dispatch(payload: TPayload): Promise<TResult>
}

export interface PartialActionHelper<TResult = any> {
    type: string,
    is(action:any): action is Action<unknown>,
    create(): Action<unknown>,
    dispatch(): Promise<TResult>
}

export type ActionHelper<TPayload = any, TResult = any> =
    TPayload extends undefined? PartialActionHelper<TResult> : FullActionHelper<TPayload, TResult>;

// instance:AnnoInstance<any>
export function implementActionHelper(
    clazz:AnyConstructor, propertyKey:string, annoActPre:string = ACTION_FIELD_PREFIX
){
    const typeField = annoActionMethod(propertyKey, 'type');
    const isField = annoActionMethod(propertyKey, 'is');
    const createField = annoActionMethod(propertyKey, 'create');
    const dispatchField = annoActionMethod(propertyKey, 'dispatch');

    Object.defineProperty(clazz.prototype, typeField,{
        get(): string {
            const self = this as AnnoInstance<any>;
            return getContext(self.contextName).assembleActionName(self.modelName, propertyKey, self.modelKey);
        },
        enumerable:true,
    })

    Object.defineProperty(clazz.prototype, isField,{
        value: function (action: Action){
            return action.type === this[typeField]
        },
        enumerable:false,
    })

    Object.defineProperty(clazz.prototype, createField,{
        value: function (payload?: any){
            return {
                type: this[typeField],
                payload
            }
        },
        enumerable:false,
    })

    Object.defineProperty(clazz.prototype, dispatchField,{
        value: function (payload?: any){
            // todo integrate thunk pattern
            const self = this as AnnoInstance<any>;
            const curAnnoCtx = getContext(self.contextName);
            const theAct = self[createField](payload);
            const promise = new Promise((resolve,reject)=>{
                curAnnoCtx.thunkByAction.set(theAct, {resolve, reject});
            })
            curAnnoCtx.store.dispatch(theAct);
            return promise;
        },
        enumerable:false,
    })
}

function implementInnerActionHelper(target:any, actionType:string) {
    Object.defineProperty(target, 'type', {
        get():string{
            return actionType
        },
        enumerable: true
    })

    Object.defineProperty(target, 'is', {
        get():Function{
            return (action: Action)=>{
                return (action?.type === actionType)
            }
        },
        enumerable: false
    })

    Object.defineProperty(target, 'create', {
        get():Function{
            return (payload?: any)=> ({
                type: actionType,
                payload
            })
        },
        enumerable: false
    })

    Object.defineProperty(target, 'dispatch', {
        get():Function{
            throw new Error("Self Dispatching Inner Actions is not supported yet")
        },
        enumerable: false
    })

    return target;
}

const REGISTER_ACTION_TYPE = '__annoRegisterActionType';
export interface RegisterOption {
    instance: AnnoInstance<any>
    state?:any
}
export const registerActionHelper = implementInnerActionHelper({},REGISTER_ACTION_TYPE) as ActionHelper<RegisterOption[],void>

const UNREGISTER_ACTION_TYPE = '__annoUnregisterActionType';
export interface UnRegisterOption {
    contextName?:string;
    modelName:string;
    modelKey:string;
}
export const unregisterActionHelper = implementInnerActionHelper({},UNREGISTER_ACTION_TYPE) as ActionHelper<UnRegisterOption[],void>

const RELOAD_ACTION_TYPE = '__annoReloadActionType';
export interface ReloadOption {
    state?:any;
}
export const reloadActionHelper = implementInnerActionHelper({},RELOAD_ACTION_TYPE) as ActionHelper<ReloadOption,void>
