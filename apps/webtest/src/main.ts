import '@unocss/reset/tailwind.css';
import { createApp } from 'vue';
import App from './App';
import router from '@/router';
import 'virtual:uno.css';

createApp(App)
  .use(router)
  .mount('#app');
