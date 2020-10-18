import {createApp} from 'vue';
import {provideStore} from 'redux-vuex';
import {Button, message} from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
// import 'ant-design-vue/lib/button/style';

import AnnoStore from './stores';

import App from './App.vue';

const app = createApp(App);

//@ts-ignore
app.config.productionTip = false;

/* Automatically register components under Button, such as Button.Group */
app.use(Button);
app.config.globalProperties.$message = message;

provideStore({
  app,
  store: AnnoStore.store,
});

app.mount('#app');
