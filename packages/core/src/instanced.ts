import {
  MODEL_SELF_KEYS_FIELD,
  MODEL_NAME_FIELD,
  MODEL_TYPE,
  MODEL_TYPE_FIELD,
  INSTANCE_KEYS_FIELD,
  AsImdAnnoInst,
  ImdAnnoConstructor,
  STATE_KEYS_FIELD,
  REDUCER_KEYS_FIELD,
  SAGA_KEYS_FIELD,
  annoActionMethod,
  THUNK_KEYS_FIELD,
} from './base';
import IdGenerator from './id';
import {WithStates, withStates} from './state';
import {WithThunk, withThunk} from './thunk';
import {WithSagas, withSagas} from './saga';
import {AnyClass, KeysOfType, Proto, prePopulateSetFieldViaPrototype} from './utils';
import {getContext, instantiate} from './AnnoContext';
import {ModelNotFound, InvalidInstanceCreatorParameters, InstanceNotFound} from './errors';

const INSTANCE_ADDL_FIELD = '__isAnnoInstance';

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
  [INSTANCE_KEYS_FIELD]: Pick<T, KeysOfType<T, IsAnnoInstanceField>>;
};

export type WithInstances<T extends AnyClass> = {
  [K in keyof T]: T[K];
} & {
  new (...args: ConstructorParameters<T>): TransformInstance<InstanceType<T>>;
};

export function withInstance<TModel extends AnyClass>(PreWrappedModel: TModel): WithInstances<TModel> {
  const ModelWithInstance = function (this: WithInstances<WithSagas<WithStates<TModel>>>) {
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

    PreWrappedModel.apply(this, arguments as any);

    const curAnnoCtx = getContext(self.contextName);
    const selfModelMeta = curAnnoCtx.getModelMeta(PreWrappedModel.prototype.constructor);

    if (!selfModelMeta) {
      throw new ModelNotFound(`Failed instantiate model ${self.name} as it was not registered via annotation @Model`);
    }

    if (PreWrappedModel.prototype.constructor.hasOwnProperty(MODEL_SELF_KEYS_FIELD)) {
      // populate the context field
      for (const [ctxField, annoConstructor] of PreWrappedModel.prototype.constructor[MODEL_SELF_KEYS_FIELD]) {
        // all the fields needed to be populated into the context
        const stateActKeys = new Set<string>();
        const actionKeys = new Set<string>();
        if (annoConstructor.hasOwnProperty(STATE_KEYS_FIELD)) {
          for (const stateKey of annoConstructor[STATE_KEYS_FIELD]) {
            actionKeys.add(stateKey);
            stateActKeys.add(stateKey);
          }
        }
        if (annoConstructor.hasOwnProperty(REDUCER_KEYS_FIELD)) {
          for (const reducerKey of annoConstructor[REDUCER_KEYS_FIELD]) {
            actionKeys.add(reducerKey);
          }
        }
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
          if (stateActKeys.has(actKey)) {
            Object.defineProperty(actKeyObj, 'value', {
              get() {
                return self[actKey];
              },
              set(val) {
                self[actKey] = val;
              },
              enumerable: true,
            });
          }
          Object.defineProperty(actKeyObj, 'type', {
            value: self[annoActionMethod(actKey, 'type')],
            enumerable: true,
            writable: false,
          });
          Object.defineProperty(actKeyObj, 'is', {
            value: self[annoActionMethod(actKey, 'is')].bind(this),
            enumerable: true,
            writable: false,
          });
          Object.defineProperty(actKeyObj, 'create', {
            value: self[annoActionMethod(actKey, 'create')].bind(this),
            enumerable: true,
            writable: false,
          });
          Object.defineProperty(actKeyObj, 'dispatch', {
            value: self[annoActionMethod(actKey, 'dispatch')].bind(this),
            enumerable: true,
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
          const theArgs = typeof args === 'function' ? args() : args;
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
          const theArgs = typeof args === 'function' ? args() : args;
          let theInstance: any;
          Object.defineProperty(self, insField, {
            get(): any {
              return theInstance || (theInstance = instantiate(model, theArgs, state, self.contextName));
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
    curAnnoCtx.validateCyclicPrototypeInstances();
  };
  ModelWithInstance.prototype = PreWrappedModel.prototype;

  return (ModelWithInstance as unknown) as WithInstances<TModel>;
}

export type HasInstances = {[INSTANCE_KEYS_FIELD]: any};
export type InstanceKeys<T extends HasInstances> = keyof T[typeof INSTANCE_KEYS_FIELD];
export function getInstanceProperty<TModel extends HasInstances, TKey extends InstanceKeys<TModel>>(
  model: TModel,
  key: TKey
) {
  return model[key];
}

export type InstancedConstructor<Model extends AnyClass> = WithInstances<
  WithSagas<WithThunk<WithStates<ImdAnnoConstructor<Model>>>>
>;
export function Instanced<Model extends AnyClass>(model: Model): InstancedConstructor<Model> {
  // the sequence here is critically important
  return withInstance(withSagas(withThunk(withStates(model as ImdAnnoConstructor<Model>))));
}

interface InnerInstanceParameters<TModel extends AnyClass> {
  model: TModel;
  args?: ConstructorParameters<TModel> | (() => ConstructorParameters<TModel>);
  state?: any;
}
export type CreateInstanceParameters<Model extends AnyClass> = ConstructorParameters<Model> extends []
  ? [Model, state?: any]
  : [Model, ConstructorParameters<Model> | (() => ConstructorParameters<Model>), state?: Record<string, any>];

export function createInstance<Model extends AnyClass>(
  ...args: CreateInstanceParameters<Model>
): InstanceType<InstancedConstructor<Model>> & IsAnnoInstanceField {
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
  return (result as unknown) as InstanceType<InstancedConstructor<Model>> & IsAnnoInstanceField;
}

export type InsTyp<M extends AnyClass> = AsImdAnnoInst<InstancedConstructor<M>>;
export type InsArg<M extends AnyClass> = [M, ConstructorParameters<M>];
