export type Nullable<T> = T | null | undefined;

export function notNull<T=any>(obj:T, preset:T):T{
    return !!obj && obj || preset;
}

export type AnyConstructor = new (...args: Array<any>) => any;

export type ConstructorArgsType<T> = T extends new (...args: infer A) => any
    ? A
    : never;

export type KeysOfType<TTarget extends Object, TValue> = {
    [K in keyof TTarget]: TTarget[K] extends TValue ? K : never
}[keyof  TTarget];

export function isObject(obj: any): boolean {
    return !!obj && typeof obj === 'object' && !Array.isArray(obj);
}
