/// <reference types="vite/client" />
/// <reference types="w3c-web-hid" />
/// <reference types="w3c-web-usb" />
/// <reference types="w3c-web-serial" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module '@fontsource/*';
