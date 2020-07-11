import { Store } from "redux";
import {AnnoConstructor, AnnoInstance, ThunkHandler, MODEL_TYPE, MODEL_NAME_FIELD} from './base';
import {AnyAction, registerActionHelper, unregisterActionHelper} from './action';
import { AnnoStoreOptions } from './store'
import {ModelReducer} from './reducer'
import {InstancedConstructor} from './instanced';
import {CyclicPrototypeInstanceFound, ModelNotFound, InstanceNotFound} from "./errors";
import { AnyConstructor, Nullable } from './utils'
import toposort from './utils/toposort'

const ACTION_NAME_SEPARATOR = 'Æ';

export interface ModelConstructors{
    modelConstructor: AnyConstructor,
    instancedConstructor:InstancedConstructor<AnyConstructor> | any
}

interface IModelMeta{
    type: MODEL_TYPE;
    name: string;
    modelConstructor:AnnoConstructor<any>;
    reducersByFieldName: Map<string, ModelReducer>;
}

export class ModelMeta implements IModelMeta, ModelConstructors{
    public readonly type: MODEL_TYPE;
    public readonly name: string;

    // todo type of AnnoConstructor instead ?
    public readonly modelConstructor: AnyConstructor;
    public readonly instancedConstructor:InstancedConstructor<AnyConstructor> | any;
    public readonly reducersByFieldName: Map<string, ModelReducer>;

    constructor(type: MODEL_TYPE, name: string, modelConstructor: AnyConstructor, instancedConstructor: AnnoConstructor<any>) {
        this.type = type;
        this.name = name;
        this.modelConstructor = modelConstructor;
        this.instancedConstructor = instancedConstructor;
        this.reducersByFieldName = new Map<string, ModelReducer>();
    }
}


export class ModelMetaDelegateInContext implements IModelMeta{

    public get type():MODEL_TYPE{
        return this.modelMeta.type;
    }

    public get name():string{
        return this.modelMeta.name;
    }
    public get modelConstructor():AnnoConstructor<any>{
        return this.modelMeta.modelConstructor;
    }
    public get reducersByFieldName():Map<string, ModelReducer>{
        return this.modelMeta.reducersByFieldName;
    }

    public singletonInstance?: AnnoInstance<any>;
    public instancesByKey: Map<string, AnnoInstance<any>>;

    constructor(
        private readonly modelMeta:ModelMeta
    ) {
        this.instancesByKey = new Map();
    }
}


export function withAnnoContext<T extends AnyConstructor>(PreWrappedModel: T, contextName:string){
    const ModelWtihReduxContextName = function (this:T){
        const self = this as AnnoInstance<T>;
        self.contextName = contextName;
        PreWrappedModel.apply(this, arguments as any);
    }
    ModelWtihReduxContextName.prototype = PreWrappedModel.prototype;
    ModelWtihReduxContextName.prototype.constructor = PreWrappedModel.prototype.constructor;
    return (ModelWtihReduxContextName as unknown) as T;
}

export class AnnoContext{

    public readonly name:string;
    private readonly ctxMgr: AnnoContextManager;

    constructor( ctxMgr: AnnoContextManager, name: string) {
        this.ctxMgr = ctxMgr;
        this.name = name;
    }

// general section
    public store:Store;
    public options: AnnoStoreOptions;

    public rootState: any;

    public readonly assembleActionName = assembleActionName;
    public readonly disassembleActionName = disassembleActionName;

    private metaDelegatesByModel: Map<AnyConstructor, ModelMetaDelegateInContext> = new Map();
    private cachedInstancedConstructor: Map<AnyConstructor, InstancedConstructor<AnyConstructor> | any> = new Map();
    public registerModel<Model extends AnyConstructor>(constructor:Model, instancedConstructor:InstancedConstructor<Model>,  modelMeta:ModelMeta){
        this.ctxMgr.registerModel(constructor, instancedConstructor, modelMeta);
        this.metaDelegatesByModel.set(constructor,new ModelMetaDelegateInContext(modelMeta));
    }
    public getModelConstructors<Model extends AnyConstructor>(modelOrName:string|Model): Nullable<ModelConstructors> {
        const result = this.ctxMgr.getModelConstructors(modelOrName);
        if (!!this.name && result){
            if (!this.cachedInstancedConstructor.has(result.modelConstructor)){
                this.cachedInstancedConstructor.set(result.modelConstructor, withAnnoContext(result.instancedConstructor, this.name));
            }
            return {
                modelConstructor: result.modelConstructor,
                instancedConstructor: this.cachedInstancedConstructor.get(result.modelConstructor)
            }
        }
        return result;
    }
    public getModelMeta(model:AnyConstructor|string):Nullable<ModelMetaDelegateInContext>{
        let modelConstructor:Nullable<AnyConstructor>;
        if (typeof model === 'string'){
            modelConstructor = this.ctxMgr.getModelConstructors(model)?.modelConstructor;
        }else {
            modelConstructor = model;
        }

        if (!!modelConstructor){
            if (this.metaDelegatesByModel.has(modelConstructor)){
                return this.metaDelegatesByModel.get(modelConstructor);
            }
            // need to create the delegate context
            const modelMeta = this.ctxMgr.getModelMeta(modelConstructor)!;
            if (!!modelMeta){
                const modelMetaDelegate = new ModelMetaDelegateInContext(modelMeta);
                this.metaDelegatesByModel.set(modelConstructor, modelMetaDelegate);
                return modelMetaDelegate;
            }
        }

        return undefined;
    }
    public getAllModelMeta():ModelMetaDelegateInContext[]{
        const results: ModelMetaDelegateInContext[] = [];
        for(const[_, modelMeta] of this.metaDelegatesByModel){
            results.push(modelMeta);
        }
        return results;
    };
    public getInstanceConstructor<Model extends AnyConstructor>(modelOrName:string|Model):Nullable<AnnoConstructor<InstancedConstructor<Model>>>{
        return this.getModelConstructors(modelOrName)?.instancedConstructor as any;
    }

    // Instance section
    private instanceMap:Map<string, any> = new Map();
    private static buildInstancePath(modelName:string, key?:string):string{
        return !!key?`${modelName}${ACTION_NAME_SEPARATOR}${key}`:modelName;
    }
    public addOneInstance(instance:AnnoInstance<any>){
        const theModelPath = AnnoContext.buildInstancePath(instance.modelName,instance.modelKey);
        const theModelMeta = this.getModelMeta(instance.modelName);
        if (this.instanceMap.has(theModelPath)){
            // todo need to reconsider the instance removing sequences
            throw new Error(`Cannot add the new instance to the path ${theModelPath}; consider to remove it first`);
        }else if (!theModelMeta){
            throw new Error(`Cannot find the model for the name of ${instance.modelName}`);
        }

        if (theModelMeta.type === MODEL_TYPE.SINGLETON){
            theModelMeta.singletonInstance = instance;
        }else {
            if (!instance.modelKey){
                throw new Error(`Cannot find the key of the instance belonging to ${theModelPath}`);
            }else {
                theModelMeta.instancesByKey.set(instance.modelKey, instance);
            }
        }
        this.instanceMap.set(theModelPath,instance);
    }
    public clearInstanceMap(){
        this.getAllModelMeta().forEach(oneMeta =>{
            oneMeta.singletonInstance = void 0;
            oneMeta.instancesByKey.clear();
        })
        this.instanceMap.clear();
    }
    public removeOneInstance(modelName:string, key?:string){
        const theModelPath = AnnoContext.buildInstancePath(modelName,key);
        if (!this.instanceMap.has(theModelPath)){
            throw new Error(`Cannot find the instance of the path ${theModelPath}`);
        }
        const theInstanceTobeRemoved = this.instanceMap.get(theModelPath);
        const theModelMeta = this.getModelMeta(modelName);
        if (!!key){
            theModelMeta!.instancesByKey.delete(key);
        }else {
            theModelMeta!.singletonInstance = void 0;
        }
        this.instanceMap.delete(theModelPath);
        return theInstanceTobeRemoved;
    }
    public getOneInstance<Model extends AnyConstructor>(modelOrName:string|Model, key?:string):InstanceType<InstancedConstructor<AnnoConstructor<Model>>>{
        const modelMeta = this.getModelMeta(modelOrName);
        if (!!modelMeta){
            const theModelPath = AnnoContext.buildInstancePath(modelMeta.name,key);
            if (!this.instanceMap.has(theModelPath)){
                throw new InstanceNotFound(`Cannot find the instance of the path ${theModelPath}`);
            }
            return this.instanceMap.get(theModelPath);
        }else {
            throw new Error(`Cannot find the model of ${modelOrName}`);
        }
    }

    // Thunk Action
    public thunkByAction: WeakMap<AnyAction, ThunkHandler> = new WeakMap();

    // prototype instance graph
    private prototypeInstanceGraph: Array<[string, string]> = [];
    private lastValidatedPrototypeInstanceGraphSize:number = this.prototypeInstanceGraph.length;
    public addPrototypeInstanceEdge(source:string, target:string){
        this.prototypeInstanceGraph.push([source, target]);
    }
    public validateCyclicPrototypeInstances(){
        if (this.lastValidatedPrototypeInstanceGraphSize !== this.prototypeInstanceGraph.length){
            try {
                toposort(this.prototypeInstanceGraph);
                this.lastValidatedPrototypeInstanceGraphSize = this.prototypeInstanceGraph.length;
            }catch (e){
                throw new CyclicPrototypeInstanceFound(e.message, this.prototypeInstanceGraph);
            }
        }
    }

}

class AnnoContextManager{

    static ANNO_CTX_MGR = new AnnoContextManager();

    constructor() {
        if (!!AnnoContextManager.ANNO_CTX_MGR){
            throw new Error("Cannot create multiple AnnoContextManagers")
        }
    }

    // Model section
    private metaByModel: Map<AnyConstructor, ModelMeta> = new Map()
    private constructorsByModelName: Map<string, ModelConstructors >= new Map();
    public registerModel<Model extends AnyConstructor>(modelConstructor:Model, instancedConstructor:InstancedConstructor<Model>,  modelMeta:ModelMeta){
        if (!this.metaByModel.has(modelConstructor) && !this.constructorsByModelName.has(modelMeta.name)){
            this.constructorsByModelName.set(modelMeta.name, {modelConstructor, instancedConstructor});
            this.metaByModel.set(modelConstructor, modelMeta);
        } else {
            throw new Error("Try to register duplicated model: "+modelMeta.name);
        }
    }
    public getModelConstructors<Model extends AnyConstructor>(modelOrName:string|Model): Nullable<ModelConstructors> {
        let result;
        if (typeof  modelOrName === 'string') {
            result = this.constructorsByModelName.get(modelOrName);
        }else if (this.metaByModel.has(modelOrName as AnyConstructor)){
            result = this.constructorsByModelName.get(this.getModelMeta(modelOrName)!.name)
        }
        return result;
    }
    public getModelMeta(model:AnyConstructor|string):Nullable<ModelMeta>{
        if (typeof model === 'string'){
            const constructors = this.constructorsByModelName.get(model);
            return !!constructors? this.metaByModel.get(constructors.modelConstructor) : undefined;
        }else{
            return  this.metaByModel.get(model);
        }
    }
    public getAllModelMeta():ModelMeta[]{
        const result:ModelMeta[] = [];
        for (const [_, modelMeta] of this.metaByModel) {
            result.push(modelMeta);
        }
        return result;
    }
    public getInstanceConstructor<Model extends AnyConstructor>(modelOrName:string|Model):Nullable<AnnoConstructor<InstancedConstructor<Model>>>{
        let result;
        if (typeof  modelOrName === 'string') {
            result = this.constructorsByModelName.get(modelOrName)?.instancedConstructor;
        }else if (this.metaByModel.has(modelOrName as AnyConstructor)){
            result = this.constructorsByModelName.get(this.getModelMeta(modelOrName)!.name)?.instancedConstructor
        }
        return result as Nullable<AnnoConstructor<InstancedConstructor<Model>>>;
    }

    private defaultCtx = new AnnoContext(this, "");
    private ctxByName:Map<string, AnnoContext> = new Map();

    getContext(contextName?:string):AnnoContext{
        if (!contextName){
            return this.defaultCtx;
        }else{
            if (!this.ctxByName.has(contextName)){
                this.ctxByName.set(contextName, new AnnoContext(this, contextName));
            }
            return this.ctxByName.get(contextName)!;
        }
    }

    instantiate(
        model:string| AnyConstructor,
        args?:any[],
        state?:any,
        contextName?:string,
    ){
        const theAnnoCtx = this.getContext(contextName);
        const InstanceConstructor  = theAnnoCtx.getInstanceConstructor(model);
        const modelName = typeof model === 'string' ?
            model :
            (!!InstanceConstructor &&!!InstanceConstructor[MODEL_NAME_FIELD])?
                InstanceConstructor[MODEL_NAME_FIELD] as string:
                model.name;

        if (!InstanceConstructor){
            throw new ModelNotFound(`Model ${modelName} is not found or invalid`);
        }
        args = args || [];
        const theInstance = new InstanceConstructor(...args) as AnnoInstance<typeof InstanceConstructor>;
        theAnnoCtx.addOneInstance(theInstance);

        theAnnoCtx.store.dispatch(registerActionHelper.create([{
            instance: theInstance,
            state
        }]))
        return theInstance;
    }

    disband(instance: AnnoInstance<any>){
        const annoCtx = this.getContext(instance.contextName);
        annoCtx.store.dispatch(unregisterActionHelper.create([instance]))

        instance.prototype = Object.prototype;
        instance.constructor = Object.prototype.constructor;

        return instance;
    }
}

const theCtxMgr = AnnoContextManager.ANNO_CTX_MGR;

export function assembleActionName(modelName:string, fieldName:string, key?:string):string{
    return !!key?
        [modelName,key,fieldName].join(ACTION_NAME_SEPARATOR):
        [modelName,fieldName].join(ACTION_NAME_SEPARATOR);
}

export function disassembleActionName(actionName:string):Nullable<{
    modelName: string,
    key?: string,
    fieldName: string
}>{
    const parts = actionName.split(ACTION_NAME_SEPARATOR);
    if (parts.length === 3){
        return {
            modelName: parts[0],
            key: parts[1],
            fieldName: parts[2]
        }
    }else if (parts.length === 2) {
        return {
            modelName: parts[0],
            key: undefined,
            fieldName: parts[1]
        }
    }else {
        return null;
    }
}
export const instantiate = theCtxMgr.instantiate.bind(theCtxMgr);
export const disband = theCtxMgr.disband.bind(theCtxMgr);
export const getContext = theCtxMgr.getContext.bind(theCtxMgr);
