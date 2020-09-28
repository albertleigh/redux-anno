import React, {useMemo, useCallback} from 'react';
import cx from 'classnames';
import {InsTyp, AnyClass, getContext} from 'redux-anno';
import {BaseView} from 'src/stores/StackedViews/BaseView';
import {VIEW_TYPE} from 'src/stores/StackedViews/BaseView';

import {WelcomePanel} from 'src/views/stacked/WelcomePanel';
import {StepPanel} from 'src/views/stacked/StepPanel';

import {StackedViewManager} from 'src/stores/StackedViews/StackedViewManager';

import style from 'src/views/stacked/ViewItemSwitcher.module.scss';

interface Props {
  current: number;
  items: InsTyp<AnyClass<BaseView>>[];
}

function getViewItem(item: BaseView, onSetToCurrent: () => void, onClose: () => Promise<void>) {
  switch (item.type) {
    case VIEW_TYPE.STEP_VIEW:
      return (
        <StepPanel key={VIEW_TYPE.STEP_VIEW} item={item as any} onSetToCurrent={onSetToCurrent} onClose={onClose} />
      );
    case VIEW_TYPE.WELCOME_VIEW:
      return (
        <WelcomePanel
          key={VIEW_TYPE.WELCOME_VIEW}
          item={item as any}
          onSetToCurrent={onSetToCurrent}
          onClose={onClose}
        />
      );
  }
  return null;
}

export const ViewItemSwitcher: React.FC<Props> = React.memo<Props>((props) => {
  const {current, items} = props;

  const defaultCtx = useMemo(getContext, []);
  const viewMgr = useMemo(() => defaultCtx.getOneInstance(StackedViewManager), [defaultCtx]);

  const handleCloseOne = useCallback(
    (index: number) => async () => {
      await viewMgr.remove.dispatch({
        index,
      });
    },
    [viewMgr]
  );

  const handleSetToCurrent = useCallback(
    (index: number) => () => {
      viewMgr.current.value = index;
    },
    [viewMgr]
  );

  return (
    <div className={style.switcherCtn}>
      {items.map((one, index) => {
        return (
          <div
            className={cx(style.switcherItem, {
              [style.activeSwitcherItem]: current === index,
            })}
            key={'' + one.contextName + one.modelName + one.modelKey}
          >
            {'' + one.contextName + one.modelName + one.modelKey}
            {getViewItem(one, handleSetToCurrent(index), handleCloseOne(index))}
          </div>
        );
      })}
    </div>
  );
});
