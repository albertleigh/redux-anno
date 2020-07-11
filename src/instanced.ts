import {
    MODEL_CTX_KEYS_FIELD, MODEL_NAME_FIELD, MODEL_TYPE, MODEL_TYPE_FIELD,
    INSTANCE_KEYS_FIELD, AnnoConstructor, AnnoInstance, STATE_KEYS_FIELD, SAGA_KEYS_FIELD, annoActionMethod
} from './base'
import IdGenerator from './id';
import {WithStates, withStates} from './state';
import {WithSagas, withSagas} from './saga';
import {
    AnyConstructor, ConstructorArgsType, KeysOfType,
} from './utils';
import {getContext, instantiate} from "./AnnoContext";
import {ModelNotFound, InvalidInstanceCreatorParameters} from './errors';

const INSTANCE_ADDL_FIELD = '__isAnnoInstance';

export interface IsAnnoInstanceField {
    [INSTANCE_ADDL_FIELD]: '__anno_instance'
}

export function Instance<
    TKey extends string,
    TTarget extends {[K in TKey]:IsAnnoInstanceField}
>(target: TTarget, propertyKey: TKey) {
    const privateTarget = target as TTarget & {
        constructor: AnnoConstructor<any>,
        __proto__: any,
    };
    if (!privateTarget.constructor.hasOwnProperty(INSTANCE_KEYS_FIELD)){
        const theNewSet = new Set();
        privateTarget.constructor[INSTANCE_KEYS_FIELD] = theNewSet;
        // pre populate from __proto__ chain
        let theProto = privateTarget.__proto__
        while (!!theProto){
            if (theProto.constructor?.hasOwnProperty(INSTANCE_KEYS_FIELD)){
                for (const oneParentInstance of theProto.constructor[INSTANCE_KEYS_FIELD]){
                    theNewSet.add(oneParentInstance);
                }
            }
            theProto = theProto.__proto__;
        }
    }
    privateTarget.constructor[INSTANCE_KEYS_FIELD]!.add(propertyKey);
}

export type HasInstances = { [INSTANCE_KEYS_FIELD]: object};
export type InstanceKeys<T extends HasInstances> = keyof T[typeof INSTANCE_KEYS_FIELD];

export function getInstanceProperty<TModel extends HasInstances, TKey extends InstanceKeys<TModel>>(model: TModel, key:TKey) {
    return model[key];
}

export type TransformInstance<T extends Object> = T & {
    [INSTANCE_KEYS_FIELD] : Pick<T, KeysOfType<T, IsAnnoInstanceField>>
};

export type WithInstances<T extends AnyConstructor> = {
    [K in keyof T]: T[K]
} & {
    new (...args: ConstructorArgsType<T>): TransformInstance<InstanceType<T>>
} & {
    contextName: string,
    modelName: string,
    modelKey?: string,
}

export function withInstance<TModel extends AnyConstructor>(PreWrappedModel: TModel):WithInstances<TModel> {

    const ModelWithInstance = function (this:WithInstances<WithSagas<WithStates<TModel>>>) {
        const self = this as AnnoInstance<TModel>;

        // set the contextName to empty str for default redux context
        if (!self.contextName){
            self.contextName = "";
        }
        self.modelName = PreWrappedModel.prototype.constructor[MODEL_NAME_FIELD];
        if (
            PreWrappedModel.prototype.constructor[MODEL_TYPE_FIELD] === MODEL_TYPE.MANUALLY ||
            PreWrappedModel.prototype.constructor[MODEL_TYPE_FIELD] === MODEL_TYPE.PROTOTYPE
        ){
            self.modelKey = IdGenerator.getNextId();
        }else {
            self.modelKey = undefined;
        }

        PreWrappedModel.apply(this, arguments as any);


        const curAnnoCtx = getContext(self.contextName);
        const selfModelMeta = curAnnoCtx.getModelMeta(PreWrappedModel.prototype.constructor);

        if (!selfModelMeta){
            throw new ModelNotFound(`Failed instantiate model ${self.name} as it was not registered via annotation @Model`)
        }

        // all the fields needed to be populated into the context
        const actionKeys = new Set<string>();
        if (PreWrappedModel.prototype.constructor.hasOwnProperty(STATE_KEYS_FIELD)){
            for (const stateKey of PreWrappedModel.prototype.constructor[STATE_KEYS_FIELD]){
                actionKeys.add(stateKey);
            }
        }
        if (PreWrappedModel.prototype.constructor.hasOwnProperty(SAGA_KEYS_FIELD)){
            for (const [sagaKey] of PreWrappedModel.prototype.constructor[SAGA_KEYS_FIELD]){
                actionKeys.add(sagaKey);
            }
        }
        if (PreWrappedModel.prototype.constructor.hasOwnProperty(MODEL_CTX_KEYS_FIELD)){
            // populate the context field
            for (const ctxField of PreWrappedModel.prototype.constructor[MODEL_CTX_KEYS_FIELD]){
                self[ctxField] = {};
                for (const actKey of actionKeys){
                    self[ctxField][actKey]={};
                    self[ctxField][actKey].type = self[annoActionMethod(actKey, 'type')];
                    self[ctxField][actKey].is = self[annoActionMethod(actKey, 'is')].bind(this);
                    self[ctxField][actKey].create = self[annoActionMethod(actKey, 'create')].bind(this);
                    self[ctxField][actKey].dispatch = self[annoActionMethod(actKey, 'dispatch')].bind(this);
                }
            }
        }

        if (PreWrappedModel.prototype.constructor.hasOwnProperty(INSTANCE_KEYS_FIELD)){
            for (const insField of PreWrappedModel.prototype.constructor[INSTANCE_KEYS_FIELD]){
                const {model, args, state} = self[insField] as InnerInstanceParameters<typeof PreWrappedModel>;
                const theModelMeta = curAnnoCtx.getModelMeta(model);

                if (theModelMeta?.type === MODEL_TYPE.SINGLETON){
                    let theInstance:any;
                    let theArgs = typeof args === 'function'? args() : args;
                    try {
                        theInstance = curAnnoCtx.getOneInstance(model);
                    }catch (e){
                        // enjoy the exception
                    }
                    Object.defineProperty(self, insField, {
                        get(): any {
                            return theInstance ||( theInstance = instantiate(model, theArgs, state, self.contextName));
                        },
                        set(v: any) {
                        },
                        enumerable: true
                    })
                }else if (theModelMeta?.type === MODEL_TYPE.PROTOTYPE){
                    // populate graph to toposort for cyclic instance
                    curAnnoCtx.addPrototypeInstanceEdge(selfModelMeta.name, theModelMeta.name);
                    let theArgs = typeof args === 'function'? args() : args;
                    let theInstance : any;
                    Object.defineProperty(self, insField, {
                        get(): any {
                            return theInstance || (theInstance = instantiate(model, theArgs, state, self.contextName));
                        },
                        set(v: any) {
                        },
                        enumerable: true
                    })
                } else {
                    console.warn(`Failed to populate the ${insField} ${self.modelName} ${self.modelKey || ""} ${self.contextName || ""}`);
                }
            }
        }
        curAnnoCtx.validateCyclicPrototypeInstances();
    }
    ModelWithInstance.prototype = PreWrappedModel.prototype;

    return (ModelWithInstance as unknown) as WithInstances<TModel>;
}

export type InstancedConstructor<Model extends AnyConstructor> =  WithInstances<WithSagas<WithStates<Model>>>;
export function Instanced<Model extends AnyConstructor>(model:Model):InstancedConstructor<Model>
{
    return withInstance(withSagas(withStates(model)));
}

interface InnerInstanceParameters<TModel extends AnyConstructor>{
    model: TModel,
    args?: ConstructorArgsType<TModel> | (()=> ConstructorArgsType<TModel>)
    state?: any
}
export type CreateInstanceParameters<Model extends AnyConstructor> =
    ConstructorArgsType<Model> extends []?
    [ Model, state?: any ]: [ Model, ConstructorArgsType<Model> | (()=> ConstructorArgsType<Model>), state?: Record<string, any> ]

export function createInstance<Model extends AnyConstructor>(
    ...args:CreateInstanceParameters<Model>
):(InstanceType< InstancedConstructor<Model>> & IsAnnoInstanceField) {
    let result: InnerInstanceParameters<any>;
    if (args.length === 3){
        result = {
            model: args[0],
            args: args[1],
            state: args[2]
        };
    }else if (args.length === 2){
        if (Array.isArray(args[1])){
            result = {
                model: args[0],
                args: args[1]
            };
        }else {
            result = {
                model: args[0],
                state: args[1]
            };
        }
    }else if (args.length === 1){
        result = {
            model: args[0],
        };
    }else {
        throw new InvalidInstanceCreatorParameters(`Cannot populate instance as its parameters are invalid`);
    }
    return (result as unknown )as InstanceType< InstancedConstructor<Model>> & IsAnnoInstanceField;
}
