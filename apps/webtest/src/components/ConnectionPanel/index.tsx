import { computed, defineComponent, reactive } from 'vue';
import { activeDevice, deviceMode, setDeviceMode, switchingDeviceMode } from '@/devices/deviceMode';
import type { DeviceMode } from '@/devices/deviceMode';
import { Button, Select, theme } from '@munet/ui';
import type { SelectOption } from '@munet/ui';

const MODE_OPTIONS: SelectOption[] = [
  { label: 'Onii-mai / IO4', value: 'io4' },
  { label: 'ADX / NDX HID', value: 'adx' },
  { label: 'Maimoller', value: 'maimoller' },
];

export default defineComponent({
  setup() {
    const connectingKeys = reactive(new Set<string>());
    const anyBusy = computed(() => connectingKeys.size > 0 || switchingDeviceMode.value);

    const handleConnect = async (key: string, connected: boolean, connect: () => Promise<void>, disconnect: () => Promise<void>) => {
      if (connected) { await disconnect(); return; }
      connectingKeys.add(key);
      const expectedMode = deviceMode.value;
      try {
        await connect();
        if (deviceMode.value !== expectedMode) {
          await disconnect();
        }
      } catch (e) {
        console.error(e);
      } finally {
        connectingKeys.delete(key);
      }
    };

    const statusDot = (connected: boolean, connecting: boolean) => {
      if (connecting) return "w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse";
      if (connected) return "w-2 h-2 rounded-full bg-green-500 flex-shrink-0";
      return "w-2 h-2 rounded-full bg-current opacity-50 flex-shrink-0";
    };

    return () => {
      const device = activeDevice.value;

      return (
        <div class="flex gap-4 flex-wrap py-2 items-center">
          <div class="min-w-50">
            <Select
              value={deviceMode.value}
              onChange={(v: string) => { void setDeviceMode(v as DeviceMode); }}
              options={MODE_OPTIONS}
              disabled={anyBusy.value}
            />
          </div>

          {device.connections.map(conn => {
            const connecting = connectingKeys.has(conn.key);
            return (
              <div key={conn.key} class={['flex items-center gap-3 px-4 py-3 rounded-xl', theme.value.listItem]}>
                <span class={statusDot(conn.connected.value, connecting)} />
                <div class="flex flex-col mr-2 min-w-24">
                  <span class="font-semibold text-[13px]">{conn.label}</span>
                  <span class="text-[11px] opacity-60">{conn.hint}</span>
                </div>
                <Button
                  onClick={() => handleConnect(conn.key, conn.connected.value, conn.connect, conn.disconnect)}
                  ing={connecting}
                  disabled={connecting || switchingDeviceMode.value}
                  size="small"
                >
                  {conn.connected.value ? '断开' : '连接'}
                </Button>
              </div>
            );
          })}
        </div>
      );
    };
  },
});
