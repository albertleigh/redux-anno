export const DELETE_TOKEN_FOR_DEEP_COPY = '__DELETE_TOKEN_FOR_DEEP_COPY__';
export function deepCopyObject(
  target: any,
  source: any,
  paths: string[] = [],
  cb?: (val: any, path: string[], target: any) => any
) {
  if (!isObject(target)) {
    throw new Error('Failed to copy to non-object target');
  }
  if (!isObject(source)) {
    throw new Error('Failed to copy from non-object source');
  }
  for (const [key, value] of Object.entries(source)) {
    if (key === '__proto__') {
      continue;
    }
    if (isObject(value)) {
      if (target[key] === undefined) {
        target[key] = {};
      }
      if (isObject(target[key])) {
        deepCopyObject(target[key], value, [...paths, key], cb);
      } else {
        throw new Error(`Failed to copy object field ${[...paths, key].join('.')} to non-object target field`);
      }
    } else {
      if (!!cb) {
        const res = cb(value, [...paths, key], target);
        if (res !== undefined) {
          target[key] = res === DELETE_TOKEN_FOR_DEEP_COPY ? res : undefined;
        }
      } else {
        target[key] = value;
      }
    }
  }
}

export function isObject(obj: any): boolean {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj);
}
