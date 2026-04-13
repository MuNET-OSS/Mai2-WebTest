import { defineComponent, ref } from 'vue';
import { serial, serialConnect, closeSerial } from '@/serial';
import { ledConnected, connectLed, disconnectLed } from '@/ledSerial';
import { io4Connected, connectIO4, disconnectIO4 } from '@/io4';
import styles from './index.module.sass';

export default defineComponent({
  setup() {
    const touchConnecting = ref(false);
    const ledConnecting = ref(false);
    const io4Connecting = ref(false);

    const handleTouchConnect = async () => {
      if (serial.isOpen) {
        await closeSerial();
        return;
      }
      touchConnecting.value = true;
      try {
        await serialConnect();
      } catch (e) {
        console.error(e);
      } finally {
        touchConnecting.value = false;
      }
    };

    const handleLedConnect = async () => {
      if (ledConnected.value) {
        await disconnectLed();
        return;
      }
      ledConnecting.value = true;
      try {
        await connectLed();
      } catch (e) {
        console.error(e);
      } finally {
        ledConnecting.value = false;
      }
    };

    const handleIO4Connect = async () => {
      if (io4Connected.value) {
        await disconnectIO4();
        return;
      }
      io4Connecting.value = true;
      try {
        await connectIO4();
      } catch (e) {
        console.error(e);
      } finally {
        io4Connecting.value = false;
      }
    };

    const statusDot = (connected: boolean, connecting: boolean) => {
      if (connecting) return styles.dotConnecting;
      if (connected) return styles.dotConnected;
      return styles.dotDisconnected;
    };

    return () => (
      <div class={styles.panel}>
        <div class={styles.item}>
          <span class={statusDot(serial.isOpen, touchConnecting.value)} />
          <span class={styles.protocol}>Touch (COM3 / COM4)</span>
          <button
            class={styles.btn}
            onClick={handleTouchConnect}
            disabled={touchConnecting.value}
          >
            {touchConnecting.value ? '...' : serial.isOpen ? '断开' : '连接'}
          </button>
        </div>

        <div class={styles.item}>
          <span class={statusDot(ledConnected.value, ledConnecting.value)} />
          <span class={styles.protocol}>LED (COM21 / COM23)</span>
          <button
            class={styles.btn}
            onClick={handleLedConnect}
            disabled={ledConnecting.value}
          >
            {ledConnecting.value ? '...' : ledConnected.value ? '断开' : '连接'}
          </button>
        </div>

        <div class={styles.item}>
          <span class={statusDot(io4Connected.value, io4Connecting.value)} />
          <span class={styles.protocol}>IO4</span>
          <button
            class={styles.btn}
            onClick={handleIO4Connect}
            disabled={io4Connecting.value}
          >
            {io4Connecting.value ? '...' : io4Connected.value ? '断开' : '连接'}
          </button>
        </div>
      </div>
    );
  },
});
