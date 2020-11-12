import {
  MODEL_SELF_KEYS_FIELD,
  MODEL_NAME_FIELD,
  MODEL_TYPE,
  MODEL_TYPE_FIELD,
  INSTANCE_ADDL_FIELD,
  INSTANCE_KEYS_FIELD,
  AsImdAnnoInst,
  ImdAnnoConstructor,
  SAGA_KEYS_FIELD,
  annoActionMethod,
  THUNK_KEYS_FIELD,
  INSTANCE_STORE_LISTENERS,
  INSTANCE_STORE_LISTENER_UNSUBSCRIBED_CB,
  INSTANCE_PROTO_INS_CREATED_BY_ME,
  WATCHED_KEYS_FIELD,
} from './base';
import IdGenerator from './id';
import {WithStates, withStates, TransformState} from './state';
import {WithReducers, withReducers, TransformReducer} from './reducer';
import {WithComputed, withComputed, TransformComputed} from './computed';
import {WithThunk, withThunk, TransformThunk} from './thunk';
import {WithSagas, withSagas, TransformSaga} from './saga';
import {AnyClass, KeysOfType, Proto, prePopulateSetFieldViaPrototype} from './utils';
import {getContext, instantiate} from './AnnoContext';
import {ModelNotFound, InvalidInstanceCreatorParameters, InstanceNotFound} from './errors';

export interface IsAnnoInstanceField {
  [INSTANCE_ADDL_FIELD]: '__anno_instance';
}

export function Instance<TKey extends string, TTarget extends {[K in TKey]: IsAnnoInstanceField}>(
  target: TTarget,
  propertyKey: TKey
) {
  const privateTarget = target as Proto<TTarget>;
  prePopulateSetFieldViaPrototype(privateTarget, INSTANCE_KEYS_FIELD);
  privateTarget.constructor[INSTANCE_KEYS_FIELD]!.add(propertyKey);
}

export type TransformInstance<T extends Record<string | number, any>> = T & {
  // due to error TS4029: Public property of exported class has or is using name 'INSTANCE_KEYS_FIELD' from external module "instanced" but cannot be named.
  // cannot use INSTANCE_KEYS_FIELD over here but have to be __annoInstanceKeys__ ding ts
  __annoInstanceKeys__: Pick<T, KeysOfType<T, IsAnnoInstanceField>>;
};

export type WithInstances<T extends AnyClass> = {
  [K in keyof T]: T[K];
} & {
  new (...args: ConstructorParameters<T>): TransformInstance<InstanceType<T>>;
};

export function withInstance<TModel extends AnyClass>(PreWrappedModel: TModel): WithInstances<TModel> {
  const ModelWithInstance = function (this: WithInstances<TModel>) {
    const self = this as AsImdAnnoInst<TModel>;

    // set the contextName to empty str for default redux context
    if (!self.contextName) {
      self.contextName = '';
    }
    self.modelName = PreWrappedModel.prototype.constructor[MODEL_NAME_FIELD];
    if (
      PreWrappedModel.prototype.constructor[MODEL_TYPE_FIELD] === MODEL_TYPE.MANUALLY ||
      PreWrappedModel.prototype.constructor[MODEL_TYPE_FIELD] === MODEL_TYPE.PROTOTYPE
    ) {
      self.modelKey = IdGenerator.getNextId();
    } else {
      self.modelKey = undefined;
    }

    self[INSTANCE_STORE_LISTENERS] = {
      reduxStoreUnsubscribe: new Set(),
      pendingComputeByFieldName: new Map(),
    };
    self[INSTANCE_PROTO_INS_CREATED_BY_ME] = new Set();

    PreWrappedModel.apply(this, arguments as any);

    const curAnnoCtx = getContext(self.contextName);
    const selfModelMeta = curAnnoCtx.getModelMeta(PreWrappedModel.prototype.constructor);

    if (!selfModelMeta) {
      throw new ModelNotFound(`Failed instantiate model ${self.name} as it was not registered via annotation @Model`);
    }

    if (!selfModelMeta.watchedStateDependenciesHelper.isInitialized()) {
      if (PreWrappedModel.prototype.constructor.hasOwnProperty(WATCHED_KEYS_FIELD)) {
        for (const watchedStateField of PreWrappedModel.prototype.constructor[WATCHED_KEYS_FIELD]) {
          const {dependencies} = self[watchedStateField];
          for (const dependency of dependencies) {
            selfModelMeta.watchedStateDependenciesHelper.addDependencies(dependency, watchedStateField);
          }
        }
        selfModelMeta.watchedStateDependenciesHelper.validateCyclicWatchedFields();
      }
      selfModelMeta.watchedStateDependenciesHelper.initialized();
    }

    if (PreWrappedModel.prototype.constructor.hasOwnProperty(MODEL_SELF_KEYS_FIELD)) {
      // populate the context field
      for (const [ctxField, annoConstructor] of PreWrappedModel.prototype.constructor[MODEL_SELF_KEYS_FIELD]) {
        // all the fields needed to be populated into the context
        const actionKeys = new Set<string>();
        if (annoConstructor.hasOwnProperty(THUNK_KEYS_FIELD)) {
          for (const thunkKey of annoConstructor[THUNK_KEYS_FIELD]) {
            actionKeys.add(thunkKey);
          }
        }
        if (annoConstructor.hasOwnProperty(SAGA_KEYS_FIELD)) {
          for (const [sagaKey] of annoConstructor[SAGA_KEYS_FIELD]) {
            actionKeys.add(sagaKey);
          }
        }

        const ctxFieldObj: Record<string | number, any> = {};
        for (const actKey of actionKeys) {
          const actKeyObj: Record<string | number, any> = {};
          // populate value fun only for the state fields
          Object.defineProperty(actKeyObj, 'type', {
            value: self[annoActionMethod(actKey, 'type')],
            enumerable: true,
            writable: false,
          });
          Object.defineProperty(actKeyObj, 'is', {
            value: self[annoActionMethod(actKey, 'is')].bind(this),
            enumerable: false,
            writable: false,
          });
          Object.defineProperty(actKeyObj, 'create', {
            value: self[annoActionMethod(actKey, 'create')].bind(this),
            enumerable: false,
            writable: false,
          });
          Object.defineProperty(actKeyObj, 'dispatch', {
            value: self[annoActionMethod(actKey, 'dispatch')].bind(this),
            enumerable: false,
            writable: false,
          });
          Object.defineProperty(ctxFieldObj, actKey, {
            value: actKeyObj,
            enumerable: true,
            writable: false,
          });
        }

        Object.defineProperty(ctxFieldObj, 'contextName', {
          value: self.contextName,
          enumerable: true,
          writable: false,
        });
        Object.defineProperty(ctxFieldObj, 'modelName', {
          value: self.modelName,
          enumerable: true,
          writable: false,
        });
        Object.defineProperty(ctxFieldObj, 'modelKey', {
          value: self.modelKey,
          enumerable: true,
          writable: false,
        });

        Object.defineProperty(self, ctxField, {
          value: ctxFieldObj,
          enumerable: true,
          writable: false,
        });
      }
    }

    if (PreWrappedModel.prototype.constructor.hasOwnProperty(INSTANCE_KEYS_FIELD)) {
      for (const insField of PreWrappedModel.prototype.constructor[INSTANCE_KEYS_FIELD]) {
        const {model, args, state} = self[insField] as InnerInstanceParameters<typeof PreWrappedModel>;
        const theModelMeta = curAnnoCtx.getModelMeta(model);

        if (theModelMeta?.type === MODEL_TYPE.SINGLETON) {
          let theInstance: any;
          const theArgs = typeof args === 'function' ? (args as any)() : args;
          try {
            theInstance = curAnnoCtx.getOneInstance(model);
          } catch (e) {
            if (e instanceof InstanceNotFound) {
              theInstance = instantiate(model, theArgs, state, self.contextName);
            }
            // enjoy the exception
          }
          Object.defineProperty(self, insField, {
            get(): any {
              return theInstance;
            },
            set(_v: any) {
              return void 0;
            },
            enumerable: true,
          });
        } else if (theModelMeta?.type === MODEL_TYPE.PROTOTYPE) {
          // populate graph to toposort for cyclic instance
          curAnnoCtx.addPrototypeInstanceEdge(selfModelMeta.name, theModelMeta.name);
          const theArgs = typeof args === 'function' ? (args as any)() : args;
          let theInstance: any;
          Object.defineProperty(self, insField, {
            get(): any {
              if (!theInstance) {
                self[INSTANCE_PROTO_INS_CREATED_BY_ME].add(insField);
                theInstance = instantiate(model, theArgs, state, self.contextName);
              }
              return theInstance;
            },
            set(_v: any) {
              return void 0;
            },
            enumerable: true,
          });
        } else {
          console.warn(
            `Failed to populate the ${insField} ${self.modelName} ${self.modelKey || ''} ${self.contextName || ''}`
          );
        }
      }
    }

    self.reduxStoreSubscribe = (listener: () => void, unsubscribedCallback?: () => void) => {
      const reduxUnsubscribe = curAnnoCtx.store.subscribe(listener);
      (reduxUnsubscribe as any)[INSTANCE_STORE_LISTENER_UNSUBSCRIBED_CB] = unsubscribedCallback;
      self[INSTANCE_STORE_LISTENERS].reduxStoreUnsubscribe.add(reduxUnsubscribe);
      return () => {
        unsubscribedCallback && unsubscribedCallback();
        self[INSTANCE_STORE_LISTENERS].reduxStoreUnsubscribe.delete(reduxUnsubscribe);
        reduxUnsubscribe();
      };
    };

    curAnnoCtx.validateCyclicPrototypeInstances();
  };
  ModelWithInstance.prototype = PreWrappedModel.prototype;

  return (ModelWithInstance as unknown) as WithInstances<TModel>;
}

export type InsHasInstances = {[INSTANCE_KEYS_FIELD]: any};
export type InstanceKeys<T extends InsHasInstances> = keyof T[typeof INSTANCE_KEYS_FIELD];
export function getInstanceProperty<TIns extends InsHasInstances, TKey extends InstanceKeys<TIns>>(
  instance: TIns,
  key: TKey
) {
  return instance[key];
}

export type InstancedConstructor<Model extends AnyClass> = WithInstances<
  WithReducers<WithComputed<WithSagas<WithThunk<WithStates<ImdAnnoConstructor<Model>>>>>>
>;
export function Instanced<Model extends AnyClass>(model: Model): InstancedConstructor<Model> {
  // the sequence here is critically important
  return withInstance(withReducers(withComputed(withSagas(withThunk(withStates(model as ImdAnnoConstructor<Model>))))));
}

interface InnerInstanceParameters<TModel extends AnyClass> {
  model: TModel;
  args?: ConstructorParameters<TModel> | (() => ConstructorParameters<TModel>);
  state?: any;
}
export type CreateInstanceParameters<Model extends AnyClass> = ConstructorParameters<Model> extends []
  ? [Model] | [Model, any]
  :
      | [Model, ConstructorParameters<Model> | (() => ConstructorParameters<Model>)]
      | [Model, ConstructorParameters<Model> | (() => ConstructorParameters<Model>), Record<string, any>];

export type TransformClzInstance<T extends Record<string | number, any>> = TransformInstance<
  TransformReducer<TransformComputed<TransformSaga<TransformThunk<TransformState<T>>>>>
>;

export function createInstance<Model extends AnyClass>(
  ...args: CreateInstanceParameters<Model>
): TransformClzInstance<AsImdAnnoInst<Model>> & IsAnnoInstanceField {
  let result: InnerInstanceParameters<any>;
  if (args.length === 3) {
    result = {
      model: args[0],
      args: args[1],
      state: args[2],
    };
  } else if (args.length === 2) {
    if (Array.isArray(args[1])) {
      result = {
        model: args[0],
        args: args[1],
      };
    } else {
      result = {
        model: args[0],
        state: args[1],
      };
    }
  } else if (args.length === 1) {
    result = {
      model: args[0],
    };
  } else {
    throw new InvalidInstanceCreatorParameters(`Cannot populate instance as its parameters are invalid`);
  }
  return (result as unknown) as TransformClzInstance<AsImdAnnoInst<Model>> & IsAnnoInstanceField;
}

export type InsTyp<M> = M extends AnyClass
  ? AsImdAnnoInst<InstancedConstructor<M>>
  : AsImdAnnoInst<TransformClzInstance<M>>;
export type InsArg<M extends AnyClass> = [M, ConstructorParameters<M>];
// export type InsArg<M> =
//   M extends AnyClass ? [M, ConstructorParameters<M>] : [AnyClass<M>, any[]];
