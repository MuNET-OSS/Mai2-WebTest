import { computed, defineComponent, reactive, unref } from 'vue';
import { activeDevice, deviceMode, setDeviceMode, switchingDeviceMode } from '@/devices/deviceMode';
import type { DeviceMode } from '@/devices/deviceMode';
import type { DeviceConnection } from '@/devices/providers/types';
import {
  applyingSetup,
  discovering,
  discoveryResult,
  isDesktopMode,
  probingSerial,
  applyRecommendedSetup,
  probeAvailableSerialPorts,
  refreshDiscovery,
  serialProbeResults,
} from '@/devices/desktopDiscovery';
import { addToast, Button, DropMenu, Select, theme } from '@munet/ui';
import type { SelectOption } from '@munet/ui';

const BASE_MODE_OPTIONS: SelectOption[] = [
  { label: 'Onii-mai / HDX / IO4', value: 'io4' },
  { label: 'NPro WinUSB', value: 'npro' },
  { label: 'ADX / NDX HID', value: 'adx' },
  { label: 'Maimoller', value: 'maimoller' },
];

interface CandidateMenuItem {
  id: string;
  label: string;
  desc?: string;
}

export default defineComponent({
  setup() {
    const connectingKeys = reactive(new Set<string>());
    const anyBusy = computed(() =>
      connectingKeys.size > 0 || switchingDeviceMode.value || applyingSetup.value,
    );

    const modeOptions = computed<SelectOption[]>(() => {
      const hasPdx = discoveryResult.value?.usbDevices.some(d => d.deviceKind === 'pdx');
      if (hasPdx || deviceMode.value === 'pdx') {
        return [...BASE_MODE_OPTIONS, { label: 'PDX（独占）', value: 'pdx' }];
      }
      return BASE_MODE_OPTIONS;
    });

    const isSerialMode = computed(() =>
      deviceMode.value === 'io4' || deviceMode.value === 'adx' || deviceMode.value === 'pdx',
    );

    const handleConnectAction = async (
      conn: DeviceConnection,
      connectFn: () => Promise<void>,
    ) => {
      if (conn.connected.value) {
        await conn.disconnect();
        return;
      }
      connectingKeys.add(conn.key);
      const expectedMode = deviceMode.value;
      try {
        await connectFn();
        if (deviceMode.value !== expectedMode) {
          await conn.disconnect();
        }
      } catch (e) {
        console.error(e);
        if (isDesktopMode.value) {
          addToast({
            message: `${conn.label} 连接失败：${e instanceof Error ? e.message : String(e)}`,
            type: 'error',
          });
        }
      } finally {
        connectingKeys.delete(conn.key);
      }
    };

    const getCandidatesForConnection = (conn: DeviceConnection): CandidateMenuItem[] => {
      const data = discoveryResult.value;
      if (!data) return [];

      if (conn.kind === 'serial-touch' || conn.kind === 'serial-led') {
        const targetRole = conn.kind === 'serial-touch' ? 'touch' : 'led';
        return [...data.serialPorts]
          .sort((a, b) => {
            const aMatch = a.recommendedFor.includes(targetRole) ? 0 : 1;
            const bMatch = b.recommendedFor.includes(targetRole) ? 0 : 1;
            return aMatch - bMatch;
          })
          .map(p => {
            const probe = serialProbeResults.value[p.portName];
            const probeText = probe
              ? (probe.detected === 'touch'
                ? '探测为触摸屏'
                : probe.detected === 'led'
                  ? '探测为灯板'
                  : '未识别应答')
              : undefined;
            const descParts = [p.friendlyName, p.recommendationReason, probeText].filter(Boolean);
            return {
              id: p.id,
              label: p.portName,
              desc: descParts.join(' · '),
            };
          });
      }

      if (conn.kind === 'hid-io4' || conn.kind === 'hid-adx' || conn.kind === 'hid-maimoller') {
        const targetKind = conn.kind.replace('hid-', '') as 'io4' | 'adx' | 'maimoller';
        return data.hidDevices
          .filter(d => d.deviceKind === targetKind)
          .map(d => ({
            id: d.id,
            label: `${d.productName || targetKind.toUpperCase()}${d.playerSide ? ` (${d.playerSide})` : ''}`,
            desc: d.recommendationReason || `VID ${d.vendorId.toString(16).padStart(4, '0').toUpperCase()} PID ${d.productId.toString(16).padStart(4, '0').toUpperCase()}`,
          }));
      }

      if (conn.kind === 'usb-pdx' || conn.kind === 'usb-npro') {
        const targetKind = conn.kind.replace('usb-', '') as 'pdx' | 'npro';
        return data.usbDevices
          .filter(d => d.deviceKind === targetKind)
          .map(d => ({
            id: d.id,
            label: `${d.productName || targetKind.toUpperCase()}${d.playerSide ? ` (${d.playerSide})` : ''}`,
            desc: d.recommendationReason || `Interface #${d.interfaceNumber}${d.location ? ` · ${d.location}` : ''}`,
          }));
      }

      return [];
    };

    const statusDot = (connected: boolean, connecting: boolean) => {
      if (connecting) return 'w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse';
      if (connected) return 'w-2 h-2 rounded-full bg-green-500 flex-shrink-0';
      return 'w-2 h-2 rounded-full bg-current opacity-50 flex-shrink-0';
    };

    const renderConnectionButton = (conn: DeviceConnection, connecting: boolean) => {
      if (conn.connected.value || !isDesktopMode.value) {
        return (
          <Button
            onClick={() => handleConnectAction(conn, conn.connect)}
            ing={connecting}
            disabled={connecting || switchingDeviceMode.value || applyingSetup.value}
            size="small"
          >
            {conn.connected.value ? '断开' : '连接'}
          </Button>
        );
      }

      const candidates = getCandidatesForConnection(conn);
      const isSerial = conn.kind === 'serial-touch' || conn.kind === 'serial-led';
      const touchBaudRate = conn.kind === 'serial-touch'
        ? discoveryResult.value?.aquaMaiHints?.touchBaudRate
        : undefined;

      if (!isSerial && candidates.length === 1) {
        const target = candidates[0];
        return (
          <Button
            onClick={() => handleConnectAction(conn, () => conn.connectById(target.id))}
            ing={connecting}
            disabled={connecting || switchingDeviceMode.value || applyingSetup.value}
            size="small"
          >
            连接
          </Button>
        );
      }

      const options = candidates.map(c => ({
        label: c.label,
        desc: c.desc,
        action: () => {
          void handleConnectAction(conn, () =>
            conn.connectById(c.id, touchBaudRate ? { baudRate: touchBaudRate } : undefined),
          );
        },
      }));

      return (
        <DropMenu options={options} align="left">
          {{
            trigger: (toggle: (val?: boolean) => void) => (
              <Button
                onClick={async () => {
                  if (candidates.length === 0) {
                    const refreshed = await refreshDiscovery();
                    const updated = getCandidatesForConnection(conn);
                    if (updated.length === 1 && !isSerial) {
                      void handleConnectAction(conn, () => conn.connectById(updated[0].id));
                      return;
                    }
                    if (!refreshed || updated.length === 0) {
                      addToast({ message: `未检测到可用的 ${conn.label} 设备`, type: 'warning' });
                      return;
                    }
                  }
                  toggle();
                }}
                ing={connecting}
                disabled={connecting || switchingDeviceMode.value || applyingSetup.value}
                size="small"
              >
                {candidates.length > 0 ? '选择连接' : '连接'}
              </Button>
            ),
          }}
        </DropMenu>
      );
    };

    return () => {
      const device = activeDevice.value;
      const setups = isDesktopMode.value ? (discoveryResult.value?.recommendedSetups ?? []) : [];

      return (
        <div class="flex flex-col gap-2 py-2">
          <div class="flex gap-4 flex-wrap items-center">
            <div class="min-w-50">
              <Select
                value={deviceMode.value}
                onChange={(v: string) => {
                  void setDeviceMode(v as DeviceMode, { skipAutoReconnect: isDesktopMode.value });
                }}
                options={modeOptions.value}
                disabled={anyBusy.value}
              />
            </div>

            {isDesktopMode.value && (
              <div class="flex items-center gap-2">
                <Button
                  size="small"
                  ing={discovering.value}
                  disabled={anyBusy.value || discovering.value}
                  onClick={() => { void refreshDiscovery(); }}
                >
                  刷新设备
                </Button>
                {isSerialMode.value && (
                  <Button
                    size="small"
                    ing={probingSerial.value}
                    disabled={anyBusy.value || probingSerial.value}
                    onClick={() => { void probeAvailableSerialPorts(); }}
                  >
                    探测串口
                  </Button>
                )}
              </div>
            )}

            {device.connections.map(conn => {
              const connecting = connectingKeys.has(conn.key);
              return (
                <div key={conn.key} class={['flex items-center gap-3 px-4 py-3 rounded-xl', theme.value.listItem]}>
                  <span class={statusDot(conn.connected.value, connecting)} />
                  <div class="flex flex-col mr-2 min-w-24">
                    <span class="font-semibold text-3.25">{conn.label}</span>
                    <span class="text-2.75 opacity-60">{unref(conn.hint)}</span>
                  </div>
                  {renderConnectionButton(conn, connecting)}
                </div>
              );
            })}
          </div>

          {setups.length > 0 && (
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs opacity-60">推荐设备：</span>
              {setups.map((setup, idx) => (
                <Button
                  key={`${setup.mode}-${setup.playerSide ?? idx}`}
                  size="small"
                  ing={applyingSetup.value}
                  disabled={anyBusy.value}
                  onClick={() => { void applyRecommendedSetup(setup); }}
                >
                  {setup.reason}{setup.playerSide ? ` (${setup.playerSide})` : ''} · 一键连接
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    };
  },
});
