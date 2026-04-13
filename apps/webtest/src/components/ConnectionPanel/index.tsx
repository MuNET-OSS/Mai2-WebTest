import { computed, defineComponent, ref, watch } from 'vue';
import { touchConnected, serialConnect, closeSerial } from '@/devices/touchSerial';
import { ledConnected, connectLed, disconnectLed } from '@/devices/ledSerial';
import { io4Connected, connectIO4, disconnectIO4 } from '@/devices/io4';
import { adxConnected, connectADX, disconnectADX } from '@/devices/adxHid';
import { mmlConnected, connectMML, disconnectMML } from '@/devices/maimollerHid';
import { deviceMode, disconnectAllDevices, type DeviceMode } from '@/devices/deviceMode';
import { Button, Select, theme } from '@munet/ui';
import type { SelectOption } from '@munet/ui';

const MODE_OPTIONS: SelectOption[] = [
  { label: 'Onii-mai / IO4', value: 'io4' },
  { label: 'ADX / NDX HID', value: 'adx' },
  { label: 'Maimoller', value: 'maimoller' },
];

export default defineComponent({
  setup() {
    const touchConnecting = ref(false);
    const ledConnecting = ref(false);
    const io4Connecting = ref(false);
    const adxConnecting = ref(false);
    const mmlConnecting = ref(false);
    const switching = ref(false);

    const anyBusy = computed(() =>
      touchConnecting.value || ledConnecting.value || io4Connecting.value
      || adxConnecting.value || mmlConnecting.value || switching.value,
    );

    watch(deviceMode, async (newMode, oldMode) => {
      if (newMode !== oldMode) {
        switching.value = true;
        try {
          await disconnectAllDevices();
        } finally {
          switching.value = false;
        }
      }
    });

    const guardedConnect = (
      expectedMode: DeviceMode,
      connectFn: () => Promise<void>,
      connectingRef: typeof touchConnecting,
    ) => async () => {
      connectingRef.value = true;
      try {
        await connectFn();
        if (deviceMode.value !== expectedMode) {
          await disconnectAllDevices();
        }
      } catch (e) {
        console.error(e);
      } finally {
        connectingRef.value = false;
      }
    };

    const handleTouchConnect = async () => {
      if (touchConnected.value) { await closeSerial(); return; }
      await guardedConnect(deviceMode.value, serialConnect, touchConnecting)();
    };

    const handleLedConnect = async () => {
      if (ledConnected.value) { await disconnectLed(); return; }
      await guardedConnect(deviceMode.value, connectLed, ledConnecting)();
    };

    const handleIO4Connect = async () => {
      if (io4Connected.value) { await disconnectIO4(); return; }
      await guardedConnect('io4', connectIO4, io4Connecting)();
    };

    const handleADXConnect = async () => {
      if (adxConnected.value) { await disconnectADX(); return; }
      await guardedConnect('adx', connectADX, adxConnecting)();
    };

    const handleMMLConnect = async () => {
      if (mmlConnected.value) { await disconnectMML(); return; }
      await guardedConnect('maimoller', connectMML, mmlConnecting)();
    };

    const statusDot = (connected: boolean, connecting: boolean) => {
      if (connecting) return "w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse";
      if (connected) return "w-2 h-2 rounded-full bg-green-500 flex-shrink-0";
      return "w-2 h-2 rounded-full bg-current opacity-50 flex-shrink-0";
    };

    const renderDeviceBox = (
      label: string,
      hint: string,
      connected: boolean,
      connecting: boolean,
      handler: () => void,
    ) => (
      <div class={['flex items-center gap-3 px-4 py-3 rounded-xl ', theme.value.listItem]}>
        <span class={statusDot(connected, connecting)} />
        <div class="flex flex-col mr-2 min-w-24">
          <span class="font-semibold text-[13px]">{label}</span>
          <span class="text-[11px] opacity-60">{hint}</span>
        </div>
        <Button
          onClick={handler}
          ing={connecting}
          disabled={connecting || switching.value}
          size="small"
        >
          {connected ? '断开' : '连接'}
        </Button>
      </div>
    );

    return () => (
      <div class="flex gap-4 flex-wrap py-2 items-center">
        <div class="min-w-40">
          <Select
            v-model:value={deviceMode.value}
            options={MODE_OPTIONS}
            disabled={anyBusy.value}
          />
        </div>

        {deviceMode.value !== 'maimoller' && (
          <>
            {renderDeviceBox('Touch', 'COM3 / COM4', touchConnected.value, touchConnecting.value, handleTouchConnect)}
            {renderDeviceBox('LED', 'COM21 / COM23', ledConnected.value, ledConnecting.value, handleLedConnect)}
          </>
        )}

        {deviceMode.value === 'io4' &&
          renderDeviceBox('IO4', 'HID Device', io4Connected.value, io4Connecting.value, handleIO4Connect)
        }

        {deviceMode.value === 'adx' &&
          renderDeviceBox('ADX / NDX', 'HID Device', adxConnected.value, adxConnecting.value, handleADXConnect)
        }

        {deviceMode.value === 'maimoller' &&
          renderDeviceBox('Maimoller', 'HID Device', mmlConnected.value, mmlConnecting.value, handleMMLConnect)
        }
      </div>
    );
  },
});
