import '@unocss/reset/tailwind.css';
import 'animate.css';
import '@fontsource/noto-sans-sc';
import '@fontsource/quicksand';
import 'virtual:uno.css';
import { createApp } from 'vue';
import App from './App';
import router from '@/router';
import { initThemeDefaults, selectedThemeName, UIThemes } from '@munet/ui';

initThemeDefaults({ hue: 353 });
selectedThemeName.value = UIThemes.DynamicLight;

createApp(App)
  .use(router)
  .mount('#app');
