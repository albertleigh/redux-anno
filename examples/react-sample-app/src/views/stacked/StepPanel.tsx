import React, {useMemo, useCallback} from 'react';
import {getContext, InsTyp} from 'redux-anno';
import {StepView} from 'src/stores/StackedViews/StepView';
import {useSelector} from 'react-redux';
import {StackedViewManager} from 'src/stores/StackedViews/StackedViewManager';

interface Props {
  onSetToCurrent: () => void;
  onClose: () => Promise<void>;
  item: InsTyp<typeof StepView>;
}

export const StepPanel: React.FC<Props> = React.memo<Props>((props) => {
  const defaultCtx = useMemo(getContext, []);
  const viewMgr = useMemo(() => defaultCtx.getOneInstance(StackedViewManager), [defaultCtx]);

  const {onSetToCurrent, onClose, item} = props;

  const title = useSelector(() => item.title);
  const stepMsg = useSelector(() => item.stepMsg);
  const step = useSelector(() => item.step);
  const stepCounter = useSelector(() => item.stepCounter);

  const handleAddStep = useCallback(async () => {
    await viewMgr.addStepView.dispatch(step + 1);
  }, [step, viewMgr.addStepView]);

  return (
    <div>
      <span>{title}</span>
      <span>{stepMsg}</span>
      <span>Stp Cnt: {stepCounter}</span>
      <button
        onClick={() => {
          item.updateStepCounter.dispatch(stepCounter + 1);
        }}
      >
        Add
      </button>
      <button
        onClick={() => {
          item.updateStepCounter.dispatch(stepCounter - 1);
        }}
      >
        Sub
      </button>
      <button onClick={onSetToCurrent}>Focus</button>
      <button onClick={onClose}>Close</button>
      <button onClick={handleAddStep}>Next Step</button>
    </div>
  );
});

export default StepPanel;
