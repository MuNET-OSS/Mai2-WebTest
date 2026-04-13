import { defineComponent, ref } from 'vue';
import { touchConnected, serialConnect, closeSerial } from '@/devices/touchSerial';
import { ledConnected, connectLed, disconnectLed } from '@/devices/ledSerial';
import { io4Connected, connectIO4, disconnectIO4 } from '@/devices/io4';
import { Button, theme } from '@munet/ui';

export default defineComponent({
  setup() {
    const touchConnecting = ref(false);
    const ledConnecting = ref(false);
    const io4Connecting = ref(false);

    const handleTouchConnect = async () => {
      if (touchConnected.value) {
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
      if (connecting) return "w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse";
      if (connected) return "w-2 h-2 rounded-full bg-green-500 flex-shrink-0";
      return "w-2 h-2 rounded-full bg-current opacity-50 flex-shrink-0";
    };

    return () => (
      <div class="flex gap-4 flex-wrap py-2">
        <div class={['flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm border border-black/5 dark:border-white/10', theme.value.listItem]}>
          <span class={statusDot(touchConnected.value, touchConnecting.value)} />
          <div class="flex flex-col mr-2 min-w-24">
            <span class="font-semibold text-[13px]">Touch</span>
            <span class="text-[11px] opacity-60">COM3 / COM4</span>
          </div>
          <Button
            onClick={handleTouchConnect}
            ing={touchConnecting.value}
            disabled={touchConnecting.value}
            size="small"
          >
            {touchConnected.value ? '断开' : '连接'}
          </Button>
        </div>

        <div class={['flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm border border-black/5 dark:border-white/10', theme.value.listItem]}>
          <span class={statusDot(ledConnected.value, ledConnecting.value)} />
          <div class="flex flex-col mr-2 min-w-24">
            <span class="font-semibold text-[13px]">LED</span>
            <span class="text-[11px] opacity-60">COM21 / COM23</span>
          </div>
          <Button
            onClick={handleLedConnect}
            ing={ledConnecting.value}
            disabled={ledConnecting.value}
            size="small"
          >
            {ledConnected.value ? '断开' : '连接'}
          </Button>
        </div>

        <div class={['flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm border border-black/5 dark:border-white/10', theme.value.listItem]}>
          <span class={statusDot(io4Connected.value, io4Connecting.value)} />
          <div class="flex flex-col mr-2 min-w-24">
            <span class="font-semibold text-[13px]">IO4</span>
            <span class="text-[11px] opacity-60">Device</span>
          </div>
          <Button
            onClick={handleIO4Connect}
            ing={io4Connecting.value}
            disabled={io4Connecting.value}
            size="small"
          >
            {io4Connected.value ? '断开' : '连接'}
          </Button>
        </div>
      </div>
    );
  },
});
