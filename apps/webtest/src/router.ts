import { createRouter, createWebHashHistory } from 'vue-router';
import Index from '@/views/Index';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Index },
    { path: '/:pathMatch(.*)*', component: Index },
  ],
});
