import { defineComponent, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { tryAutoReconnectTouch } from '@/devices/touchSerial';
import { tryAutoReconnectLed } from '@/devices/ledSerial';
import { tryAutoReconnectIO4 } from '@/devices/io4';
import { modalShowing, GlobalElementsContainer as UIGlobalElementsContainer } from '@munet/ui';
import styles from './App.module.sass';

export default defineComponent({
  setup() {
    onMounted(async () => {
      await tryAutoReconnectTouch();
      await tryAutoReconnectLed();
      tryAutoReconnectIO4();
    });

    return () => <div
      class={[styles.contentRoot, modalShowing.value && styles.modalOpen]}
    >
      <UIGlobalElementsContainer />
      <RouterView />
    </div>;
  },
});
