import { defineConfig } from 'vite';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vueJsx(),
    vue(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
