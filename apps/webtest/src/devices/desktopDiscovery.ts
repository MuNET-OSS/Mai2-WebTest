import { ref } from 'vue';
import { addToast } from '@munet/ui';
import { activeDevice, setDeviceMode, tryAutoReconnectActiveDevice } from './deviceMode';
import {
  getTransport,
  initTransport,
  type DiscoveryResult,
  type RecommendedSetup,
  type SerialProbeResult,
} from './transport';

export const isDesktopMode = ref(false);
export const discoveryResult = ref<DiscoveryResult | null>(null);
export const discovering = ref(false);
export const probingSerial = ref(false);
export const applyingSetup = ref(false);
export const serialProbeResults = ref<Record<string, SerialProbeResult>>({});

export async function refreshDiscovery(): Promise<DiscoveryResult | null> {
  const transport = getTransport();
  if (transport.kind !== 'desktop') return null;

  discovering.value = true;
  try {
    const result = await transport.discover();
    discoveryResult.value = result;
    return result;
  } catch (e) {
    console.error('Failed to discover desktop hardware:', e);
    addToast({
      message: e instanceof Error ? e.message : '枚举本地设备失败',
      type: 'error',
    });
    return null;
  } finally {
    discovering.value = false;
  }
}

export async function probeAvailableSerialPorts(): Promise<void> {
  const transport = getTransport();
  if (transport.kind !== 'desktop' || !transport.probeSerialPort) return;

  const ports = discoveryResult.value?.serialPorts ?? [];
  if (!ports.length) {
    addToast({ message: '未检测到可探测的串口', type: 'warning' });
    return;
  }

  probingSerial.value = true;
  try {
    const results: Record<string, SerialProbeResult> = { ...serialProbeResults.value };
    for (const port of ports) {
      try {
        results[port.portName] = await transport.probeSerialPort(port.portName);
      } catch (e) {
        results[port.portName] = {
          detected: 'unknown',
          detail: e instanceof Error ? e.message : '探测失败',
        };
      }
    }
    serialProbeResults.value = results;

    const foundTouch = Object.entries(results).filter(([, r]) => r.detected === 'touch').map(([p]) => p);
    const foundLed = Object.entries(results).filter(([, r]) => r.detected === 'led').map(([p]) => p);
    if (foundTouch.length || foundLed.length) {
      const parts: string[] = [];
      if (foundTouch.length) parts.push(`触摸: ${foundTouch.join(', ')}`);
      if (foundLed.length) parts.push(`灯板: ${foundLed.join(', ')}`);
      addToast({ message: `探测完成 (${parts.join(' · ')})`, type: 'success' });
    } else {
      addToast({ message: '探测完成，未识别出触摸/灯板应答（可能端口正被占用或需手动选择）', type: 'info' });
    }
  } finally {
    probingSerial.value = false;
  }
}

export async function applyRecommendedSetup(setup: RecommendedSetup, options?: { silent?: boolean }): Promise<void> {
  applyingSetup.value = true;
  try {
    await setDeviceMode(setup.mode, { skipAutoReconnect: true });
    const connections = activeDevice.value.connections;
    const errors: string[] = [];

    const connectIfNeeded = async (key: string, id?: string, baudRate?: number) => {
      if (!id) return;
      const conn = connections.find(c => c.key === key);
      if (!conn) return;
      try {
        if (conn.connected.value) {
          await conn.disconnect();
        }
        await conn.connectById(id, baudRate ? { baudRate } : undefined);
      } catch (e) {
        errors.push(`${conn.label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    await connectIfNeeded('npro', setup.usbDeviceId);
    await connectIfNeeded('pdx', setup.usbDeviceId);
    await connectIfNeeded('mml', setup.hidDeviceId);
    await connectIfNeeded('io4', setup.hidDeviceId);
    await connectIfNeeded('adx', setup.hidDeviceId);
    await connectIfNeeded('touch', setup.touchSerialId, setup.touchBaudRate);
    await connectIfNeeded('led', setup.ledSerialId);

    if (errors.length) {
      addToast({
        message: `部分设备未能自动连接：${errors.join('；')}`,
        type: 'warning',
      });
    } else if (!options?.silent) {
      addToast({ message: `已连接：${setup.reason}`, type: 'success' });
    }
  } finally {
    applyingSetup.value = false;
  }
}

export async function initDesktopApp(): Promise<void> {
  const transport = await initTransport();
  if (transport.kind !== 'desktop') {
    await tryAutoReconnectActiveDevice();
    return;
  }

  isDesktopMode.value = true;
  const result = await refreshDiscovery();
  const setups = result?.recommendedSetups ?? [];
  if (!setups.length) return;

  const primary = setups[0];
  if (primary.autoConnect) {
    await applyRecommendedSetup(primary, { silent: false });
  } else {
    await setDeviceMode(primary.mode, { skipAutoReconnect: true });
  }
}
