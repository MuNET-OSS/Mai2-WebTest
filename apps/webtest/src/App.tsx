import { defineComponent, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { tryAutoReconnectTouch } from '@/devices/touchSerial';
import { tryAutoReconnectLed } from '@/devices/ledSerial';
import { tryAutoReconnectIO4 } from '@/devices/io4';

export default defineComponent({
  setup() {
    onMounted(async () => {
      await tryAutoReconnectTouch();
      await tryAutoReconnectLed();
      tryAutoReconnectIO4();
    });

    return () => <RouterView />;
  },
});
