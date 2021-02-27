import {all, putResolve} from 'redux-saga/effects';
import {createReducer, createState, Model, MODEL_TYPE, Reducer, Saga, State} from 'redux-anno';

// import {ModelSates} from 'redux-anno'
// ModelSates<BaseRepository<T>>
interface State<T> {
  allIds: string[];
  byId: Record<string, T>;
}

@Model(MODEL_TYPE.SINGLETON, 'BaseRepository')
export class BaseRepository<T> {
  @State allIds = createState<string[]>([]);
  @State byId = createState<Record<string, T>>({} as Record<string, T>);

  getEntityId(t: T): string {
    if ('id' in t) {
      return (t as any).id as string;
    }
    throw 'BaseRepository getId is not implemented';
  }

  getItems(ids: string[]): T[] {
    const byId = this.byId.value as Record<string, T>;
    return ids.map((one) => byId[one]);
  }

  @Reducer
  doClear = createReducer((_preState: State<T>) => {
    return {
      ..._preState,
      allIds: [],
      byId: {},
    };
  });

  @Reducer
  doUpdate = createReducer((preState: State<T>, items: T[]) => {
    if (!!items.length) {
      const allIds = [...preState.allIds];
      const byId = {...preState.byId};
      for (const item of items) {
        const id = this.getEntityId(item);
        if (!(id in byId)) {
          allIds.push(id);
        }
        byId[id] = item;
      }
      return {
        ...preState,
        allIds,
        byId,
      };
    } else {
      return preState;
    }
  });

  @Reducer
  doDelete = createReducer((preState: State<T>, ids: string[]) => {
    if (!!ids.length) {
      const deletedIdSet = new Set(ids);
      const allIds = preState.allIds.filter((one) => !deletedIdSet.has(one));
      const byId = {...preState.byId};
      for (const id of ids) {
        delete byId[id];
      }
      return {
        ...preState,
        allIds,
        byId,
      };
    } else {
      return preState;
    }
  });

  @Saga()
  *doUpdateAndDelete(items: (T | string)[]) {
    const updateSet = new Map<string, T>();
    const deleteSet = new Set<string>();
    for (const one of items) {
      if (typeof one === 'string') {
        if (updateSet.has(one)) {
          updateSet.delete(one);
        }
        deleteSet.add(one);
      } else {
        const id = this.getEntityId(one);
        if (deleteSet.has(id)) {
          deleteSet.delete(id);
        }
        updateSet.set(id, one);
      }
    }
    const toUpdate = Array.from(updateSet.values());
    const toDelete = Array.from(deleteSet);

    yield all([putResolve(this.doUpdate.create(toUpdate)), putResolve(this.doDelete.create(toDelete))]);
  }
}
