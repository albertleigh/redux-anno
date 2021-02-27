import {createReducer, createState, Model, MODEL_TYPE, Reducer, Saga, State} from 'redux-anno';
import {BaseRepository} from './BaseRepository';
import {apply, putResolve} from 'redux-saga/effects';

// import {ModelSates} from 'redux-anno'
// ModelSates<CachedRepository<T>>
interface State {
  timestampById: Record<string, number>;
  expiredTimestampById: Record<string, number>;
  readingTimestampById: Record<string, number | undefined | null>;
  writingTimestampById: Record<string, number | undefined | null>;
}

export interface IdsOfOneTimestamp {
  ids: string[];
  timestamp: number;
}

export interface ItemsOfOneTimestamp<T> {
  items: T[];
  timestamp: number;
}

@Model(MODEL_TYPE.SINGLETON, 'CachedRepository')
export class CachedRepository<T> extends BaseRepository<T> {
  @State timestampById = createState<Record<string, number>>({});
  @State expiredTimestampById = createState<Record<string, number>>({});
  @State readingTimestampById = createState<Record<string, number | undefined | null>>({});
  @State writingTimestampById = createState<Record<string, number | undefined | null>>({});

  getTimestampById(id: string): number {
    const timestampById = this.timestampById.value;
    return timestampById[id] || 0;
  }

  getExpiredTimestampById(id: string): number {
    const expiredTimestampById = this.expiredTimestampById.value;
    return expiredTimestampById[id] || 0;
  }

  geReadingTimestampById(id: string): number {
    const readingTimestampById = this.readingTimestampById.value;
    return readingTimestampById[id] || 0;
  }

  getWritingTimestampById(id: string): number {
    const writingTimestampById = this.writingTimestampById.value;
    return writingTimestampById[id] || 0;
  }

  isExpiredById(id: string): boolean {
    return (
      this.getExpiredTimestampById(id) >= this.getTimestampById(id) &&
      new Date().getTime() >= this.getExpiredTimestampById(id)
    );
  }

  @Reducer
  updateTimestamps = createReducer((preState: State, payload: IdsOfOneTimestamp) => {
    const {ids, timestamp} = payload;
    const timestampById = {...this.timestampById.value};
    for (const id of ids) {
      timestampById[id] = timestamp;
    }
    return {
      ...preState,
      timestampById,
    };
  });

  @Reducer
  updateExpiredTimestamps = createReducer((preState: State, payload: IdsOfOneTimestamp) => {
    const {ids, timestamp} = payload;
    const expiredTimestampById = {...this.expiredTimestampById.value};
    for (const id of ids) {
      expiredTimestampById[id] = timestamp;
    }
    return {
      ...preState,
      expiredTimestampById,
    };
  });

  @Reducer
  updateReadingTimestamps = createReducer((preState: State, payload: IdsOfOneTimestamp) => {
    const {ids, timestamp} = payload;
    const readingTimestampById = {...this.readingTimestampById.value};
    for (const id of ids) {
      readingTimestampById[id] = timestamp;
    }
    return {
      ...preState,
      readingTimestampById,
    };
  });

  @Reducer
  updateWritingTimestamps = createReducer((preState: State, payload: IdsOfOneTimestamp) => {
    const {ids, timestamp} = payload;
    const writingTimestampById = {...this.writingTimestampById.value};
    for (const id of ids) {
      writingTimestampById[id] = timestamp;
    }
    return {
      ...preState,
      writingTimestampById,
    };
  });

  /**
   *  Returns the ids needed to be read and the timestamp
   * @param payload.ids the ids expected to be read
   * @param payload.overwriteByForce force to read all disregarding the timestamps
   * @return the ids need to be read according to the timestamps
   */
  @Saga()
  *startToRead(payload: {ids: string[]; overwriteByForce?: boolean}) {
    const {ids, overwriteByForce} = payload;
    const timestamp = new Date().getTime();

    const idsToRead = overwriteByForce ? ids : ids.filter((one) => this.isExpiredById(one));
    yield putResolve(
      this.updateReadingTimestamps.create({
        ids: idsToRead,
        timestamp,
      })
    );

    return {
      ids: idsToRead,
      timestamp,
    };
  }

  /**
   *  Returns the items and their ids read and stored, and the timestamp
   * @param payload
   */
  @Saga()
  *finishReading(payload: ItemsOfOneTimestamp<T>) {
    const {timestamp} = payload;
    const readingTimestampIds = Object.entries(this.readingTimestampById.value)
      .filter(([_id, time]) => time === timestamp)
      .map(([id]) => id);
    try {
      const ids: string[] = [];
      const items: T[] = [];
      (payload.items || []).forEach((one) => {
        const id = this.getEntityId(one);
        if (timestamp > this.getTimestampById(id)) {
          ids.push(id);
          items.push(one);
        }
      });
      yield apply(this as any, 'updateItems', items);
      yield putResolve(
        this.updateTimestamps.create({
          ids,
          timestamp,
        })
      );
      return {
        ids,
        items,
        timestamp,
      };
    } finally {
      yield putResolve(
        this.updateReadingTimestamps.create({
          ids: readingTimestampIds,
          timestamp,
        })
      );
    }
  }

  /**
   *
   * @param payload
   */
  @Saga()
  *startToWrite(payload: {ids: string[]}) {
    const {ids} = payload;
    const timestamp = new Date().getTime();

    if (ids.some((id) => !!this.getWritingTimestampById(id))) {
      throw 'Cannot Write to the same id multiple times';
    }
    const results = {ids, timestamp};
    yield putResolve(this.updateWritingTimestamps.create(results));
    return results;
  }

  /**
   *
   * @param payload
   */
  @Saga()
  *finishWriting(payload: ItemsOfOneTimestamp<T>) {
    const {timestamp} = payload;
    const writingTimestampIds = Object.entries(this.writingTimestampById.value)
      .filter(([_id, time]) => time === timestamp)
      .map(([id]) => id);

    try {
      const ids: string[] = [];
      const items: T[] = [];
      (payload.items || []).forEach((one) => {
        const id = this.getEntityId(one);
        if (timestamp > this.getTimestampById(id)) {
          ids.push(id);
          items.push(one);
        }
      });
      yield apply(this as any, 'updateItems', items);
      yield putResolve(
        this.updateTimestamps.create({
          ids,
          timestamp,
        })
      );
      return {
        ids,
        items,
        timestamp,
      };
    } finally {
      yield putResolve(
        this.updateWritingTimestamps.create({
          ids: writingTimestampIds,
          timestamp,
        })
      );
    }
  }

  /**
   * the cb that do update to the store and override it if needed
   * @param items
   */
  async updateItems(items: T[]) {
    await this.doUpdate.dispatch(items);
  }
}
