import {ACTION_FIELD_PREFIX, annoActionMethod, AsImdAnnoInst} from './base';
import {AnyClass} from './utils';
import {getContext} from './AnnoContext';

export interface AnyAction {
  type: string;
  payload: any;
}

export interface Action<TPayload = any> {
  type: string;
  payload?: TPayload;
}

export interface FullActionHelper<TPayload = any, TResult = any> {
  type: string;
  is(action: any): action is Action<TPayload>;
  create(payload: TPayload): Action<TPayload>;
  dispatch(payload: TPayload): Promise<TResult>;
}

export interface StateActionHelper<TPayload = any> extends FullActionHelper<TPayload, void> {
  value: TPayload;
}

export interface PartialActionHelper<TResult = any> {
  type: string;
  is(action: any): action is Action<unknown>;
  create(): Action<unknown>;
  dispatch(): Promise<TResult>;
}

export type ActionHelper<TPayload = any, TResult = any> = TPayload extends undefined
  ? PartialActionHelper<TResult>
  : FullActionHelper<TPayload, TResult>;

// instance:AsImdAnnoInst<any>
export function implementActionHelper(
  clazz: AnyClass,
  propertyKey: string,
  annoActPre: string = ACTION_FIELD_PREFIX
): void {
  const typeField = annoActionMethod(propertyKey, 'type', annoActPre);
  const isField = annoActionMethod(propertyKey, 'is', annoActPre);
  const createField = annoActionMethod(propertyKey, 'create', annoActPre);
  const dispatchField = annoActionMethod(propertyKey, 'dispatch', annoActPre);

  Object.defineProperty(clazz.prototype, typeField, {
    get(): string {
      const self = this as AsImdAnnoInst<any>;
      return getContext(self.contextName).assembleActionName(self.modelName, propertyKey, self.modelKey);
    },
    enumerable: true,
  });

  Object.defineProperty(clazz.prototype, isField, {
    value: function (action: Action) {
      return action.type === this[typeField];
    },
    enumerable: false,
  });

  Object.defineProperty(clazz.prototype, createField, {
    value: function (payload?: any) {
      return {
        type: this[typeField],
        payload,
      };
    },
    enumerable: false,
  });

  Object.defineProperty(clazz.prototype, dispatchField, {
    value: function (payload?: any) {
      const self = this as AsImdAnnoInst<any>;
      const curAnnoCtx = getContext(self.contextName);
      const theAct = self[createField](payload);
      const promise = new Promise((resolve, reject) => {
        curAnnoCtx.thunkPromiseByAction.set(theAct, {resolve, reject});
      });
      curAnnoCtx.store.dispatch(theAct);
      return promise;
    },
    enumerable: false,
  });
}

function implementInnerActionHelper(target: any, actionType: string) {
  Object.defineProperty(target, 'type', {
    value: actionType,
    enumerable: true,
    writable: false,
  });

  Object.defineProperty(target, 'is', {
    value: function (action: Action): boolean {
      return action?.type === actionType;
    },
    enumerable: false,
    writable: false,
  });

  Object.defineProperty(target, 'create', {
    value: function (payload?: any): Action {
      return {
        type: actionType,
        payload,
      };
    },
    enumerable: false,
    writable: false,
  });

  Object.defineProperty(target, 'dispatch', {
    value: function (): Promise<unknown> {
      throw new Error('Self Dispatching Inner Actions is not supported yet');
    },
    enumerable: false,
    writable: false,
  });

  return target;
}

const REGISTER_ACTION_TYPE = '__annoRegisterActionType';
export interface RegisterOption {
  instance: AsImdAnnoInst<any>;
  state?: any;
}
export const registerActionHelper = implementInnerActionHelper({}, REGISTER_ACTION_TYPE) as ActionHelper<
  RegisterOption[],
  void
>;

const UNREGISTER_ACTION_TYPE = '__annoUnregisterActionType';
export interface UnRegisterOption {
  contextName?: string;
  modelName: string;
  modelKey: string;
}
export const unregisterActionHelper = implementInnerActionHelper({}, UNREGISTER_ACTION_TYPE) as ActionHelper<
  UnRegisterOption[],
  void
>;

const RELOAD_ACTION_TYPE = '__annoReloadActionType';
export interface ReloadOption {
  state?: any;
}
export const reloadActionHelper = implementInnerActionHelper({}, RELOAD_ACTION_TYPE) as ActionHelper<
  ReloadOption,
  void
>;
