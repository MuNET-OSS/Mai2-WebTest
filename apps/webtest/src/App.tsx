import { defineComponent, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { tryAutoReconnectTouch } from '@/devices/touchSerial';
import { tryAutoReconnectLed } from '@/devices/ledSerial';
import { tryAutoReconnectIO4 } from '@/devices/io4';
import { tryAutoReconnectADX } from '@/devices/adxHid';
import { tryAutoReconnectMML } from '@/devices/maimollerHid';
import { deviceMode } from '@/devices/deviceMode';
import { modalShowing, GlobalElementsContainer as UIGlobalElementsContainer } from '@munet/ui';
import styles from './App.module.sass';

export default defineComponent({
  setup() {
    onMounted(async () => {
      const mode = deviceMode.value;

      if (mode !== 'maimoller') {
        await tryAutoReconnectTouch();
        await tryAutoReconnectLed();
      }

      if (mode === 'io4') {
        await tryAutoReconnectIO4();
      } else if (mode === 'adx') {
        await tryAutoReconnectADX();
      } else if (mode === 'maimoller') {
        await tryAutoReconnectMML();
      }
    });

    return () => <div
      class={[styles.contentRoot, modalShowing.value && styles.modalOpen]}
    >
      <UIGlobalElementsContainer />
      <RouterView />
    </div>;
  },
});
