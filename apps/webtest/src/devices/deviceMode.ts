import { computed, ref } from 'vue';
import { useStorage } from '@vueuse/core';
import { io4Provider } from './providers/io4Provider';
import { adxProvider } from './providers/adxProvider';
import { maimollerProvider } from './providers/maimollerProvider';
import { pdxProvider } from './providers/pdxProvider';
import type { DeviceMode, TestDeviceProvider } from './providers/types';

export type { DeviceMode, TestDeviceProvider } from './providers/types';

export const deviceMode = useStorage<DeviceMode>('deviceMode', 'io4');
export const switchingDeviceMode = ref(false);

const providers: Record<DeviceMode, TestDeviceProvider> = {
  io4: io4Provider,
  adx: adxProvider,
  maimoller: maimollerProvider,
  pdx: pdxProvider,
};

export const activeDevice = computed(() => providers[deviceMode.value]);

const isSerialMode = (m: DeviceMode) => m === 'io4' || m === 'adx';

async function transitionDeviceMode(from: DeviceMode, to: DeviceMode) {
  if (isSerialMode(from) && isSerialMode(to)) {
    await providers[from].lifecycle.disconnectExclusiveConnections();
    return;
  }
  await providers[from].lifecycle.disconnectPresentedConnections();
}

async function tryRestoreModeConnections(from: DeviceMode, to: DeviceMode) {
  if (isSerialMode(from) && isSerialMode(to)) {
    await providers[to].lifecycle.tryAutoReconnectExclusiveConnections();
    return;
  }
  await providers[to].lifecycle.tryAutoReconnectPresentedConnections();
}

export async function setDeviceMode(nextMode: DeviceMode) {
  const prevMode = deviceMode.value;
  if (prevMode === nextMode) return;

  switchingDeviceMode.value = true;
  try {
    await transitionDeviceMode(prevMode, nextMode);
    deviceMode.value = nextMode;
    await tryRestoreModeConnections(prevMode, nextMode);
  } finally {
    switchingDeviceMode.value = false;
  }
}

export async function tryAutoReconnectActiveDevice() {
  await activeDevice.value.lifecycle.tryAutoReconnectPresentedConnections();
}
