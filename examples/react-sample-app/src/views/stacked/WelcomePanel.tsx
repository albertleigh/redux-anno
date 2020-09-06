import React from 'react';
import {InsTyp} from 'redux-anno';
import {useSelector} from 'react-redux';
import {WelcomeView} from 'src/stores/StackedViews/WelcomeView';

interface Props {
  onSetToCurrent: () => void;
  onClose: () => Promise<void>;
  item: InsTyp<typeof WelcomeView>;
}

export const WelcomePanel: React.FC<Props> = React.memo<Props>((props) => {
  const {onSetToCurrent, onClose, item} = props;

  const title = useSelector(() => item.title);
  const welcomeMsg = useSelector(() => item.welcomeMsg);
  const modelKey = useSelector(() => item.modelKey);

  return (
    <div>
      <span>{title}</span>
      <span>{welcomeMsg}</span>
      <span>{modelKey}</span>
      <button onClick={onSetToCurrent}>Focus</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
});

export default WelcomePanel;
