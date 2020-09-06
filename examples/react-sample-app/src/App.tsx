import React from 'react';
import {Provider} from 'react-redux';
import AnnoStore from 'src/stores';
import MainEntry from 'src/layouts/MainEntry';
import MainView from 'src/views/main';

const Entry: React.FC = function () {
  return (
    <MainEntry>
      <MainView />
    </MainEntry>
  );
};

function App() {
  return (
    <Provider store={AnnoStore.store}>
      <Entry />
    </Provider>
  );
}

export default App;
