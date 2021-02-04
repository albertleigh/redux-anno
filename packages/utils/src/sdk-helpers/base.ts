export const MSG_PREFIX = '__anno_sdk_helper_msg:';

export interface ClientDelegatorBaseOption {
  contextName: string;
  modelName: string;
  modelKey: string | undefined;
  // model
  onMessage(listener: (data: string) => void): void;
  postMessage(data: string): void;
  unsubscribe?(listener: (data: string) => void): void;
}

export enum HealthStatus {
  INIT = 0xd01,
  LIVE = 0xd02,
  DEAD = 0xd03,
}

export type SdkMessage =
  | InitMessage
  | ReadyMessage
  | AckMessage
  | UpdateMessage
  | TriggerMessage
  | ReturnMessage
  | CloseMessage
  | FinMessage;

export interface BaseMessage {
  readonly channel: 'INIT' | 'READY' | 'UPDATE' | 'ACK' | 'TRIGGER' | 'RETURN' | 'CLOSE' | 'FIN';
  readonly sequence: number;
  readonly contextName: string;
  readonly modelName: string;
  readonly modelKey: string | undefined;
}

export interface InitMessage extends BaseMessage {
  readonly channel: 'INIT';
}

export interface ReadyMessage extends BaseMessage {
  readonly channel: 'READY';
  readonly state: any;
  readonly methods: string[];
}

export interface UpdateMessage extends BaseMessage {
  readonly channel: 'UPDATE';
  readonly partialState: any;
}

export interface AckMessage extends BaseMessage {
  readonly channel: 'ACK';
}

export interface TriggerMessage extends BaseMessage {
  readonly channel: 'TRIGGER';
  readonly method: string;
  readonly payload: any;
}

export interface ReturnMessage extends BaseMessage {
  readonly channel: 'RETURN';
  readonly result?: any | undefined;
  readonly error?: any | undefined;
}

export interface CloseMessage extends BaseMessage {
  readonly channel: 'CLOSE';
}

export interface FinMessage extends BaseMessage {
  readonly channel: 'FIN';
}

export interface ThenableHandler {
  resolve: (value: any) => void;
  reject: (value: any) => void;
}

export function isSdkHelperMsg(data: string) {
  return data.indexOf(MSG_PREFIX) === 0;
}

export function buildModelPrefix(obj: {contextName: string; modelName: string; modelKey: string | undefined}) {
  return `__anno_model${obj.contextName}${obj.modelName}${obj.modelName || ''}:`;
}

export function serializeMessage(msg: SdkMessage) {
  return `${MSG_PREFIX}${buildModelPrefix(msg)}${JSON.stringify(msg)}`;
}

export function isModelMsg(data: string, obj: {contextName: string; modelName: string; modelKey: string | undefined}) {
  return data.indexOf(buildModelPrefix(obj)) === 0;
}

export function deserializeMessage(
  data: string,
  obj: {contextName: string; modelName: string; modelKey: string | undefined}
): SdkMessage | undefined {
  const fullPrefix = `${MSG_PREFIX}${buildModelPrefix(obj)}`;
  if (data.indexOf(fullPrefix) === 0) {
    const payloadstr = data.slice(fullPrefix.length, data.length);
    return JSON.parse(payloadstr) as SdkMessage;
  }
  return;
}
