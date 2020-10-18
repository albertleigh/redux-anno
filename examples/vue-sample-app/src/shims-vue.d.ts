declare module '*.vue' {
  import type {DefineComponent} from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: <R>(o: R) => R;
}
