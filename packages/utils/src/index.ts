import {BaseRepository} from './examples/Respository/BaseRepository';
import {CachedRepository} from './examples/Respository/CachedRepository';

import {BaseViewItem} from './examples/StackViews/ViewItem';
import {BaseStackViewManager} from './examples/StackViews/StackViewManager';

export default {
  examples: {
    Repository: {
      BaseRepository,
      CachedCrudRepository: CachedRepository,
    },
    StackViews: {
      BaseViewItem,
      BaseStackViewManager,
    },
  },
};
