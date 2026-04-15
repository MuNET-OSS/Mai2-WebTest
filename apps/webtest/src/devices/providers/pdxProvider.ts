import { computed } from 'vue';
import type { TestDeviceProvider } from './types';
import { pdxConnected, pdxSelectedZones, connectPDX, disconnectPDX, tryAutoReconnectPDX } from '@/devices/pdxUsb';
import { ledConnected, connectLed, disconnectLed, setAllLedColor, setFrameLightBrightness, tryAutoReconnectLed } from '@/devices/ledSerial';
import { io4Connected, buttonStates, player1Buttons, connectIO4, disconnectIO4, tryAutoReconnectIO4, setTopLightColor } from '@/devices/io4';

export const pdxProvider: TestDeviceProvider = {
  mode: 'pdx',
  displayName: 'PDX（独占）',

  touch: { zones: pdxSelectedZones },

  buttons: {
    connected: io4Connected,
    player1: player1Buttons,
    states: buttonStates,
    systemButtons: ['SERVICE', 'TEST', '1P_SEL', '2P_SEL'],
  },

  lighting: {
    available: computed(() => io4Connected.value || ledConnected.value),
    topLight: {
      supported: true,
      available: computed(() => io4Connected.value),
      async setColor(r, g, b) { if (io4Connected.value) await setTopLightColor(r, g, b); },
    },
    buttonLight: {
      supported: true,
      available: computed(() => ledConnected.value),
      async setColor(r, g, b) { if (ledConnected.value) await setAllLedColor(r, g, b); },
    },
    frameLight: {
      supported: true,
      available: computed(() => ledConnected.value),
      async setBrightness(v) { if (ledConnected.value) await setFrameLightBrightness(v); },
    },
  },

  connections: [
    { key: 'pdx', label: 'PDX 触摸', hint: 'WinUSB Device', connected: pdxConnected, connect: connectPDX, disconnect: disconnectPDX },
    { key: 'led', label: 'LED', hint: 'COM21 / COM23', connected: ledConnected, connect: connectLed, disconnect: disconnectLed },
    { key: 'io4', label: 'IO4', hint: 'HID Device', connected: io4Connected, connect: connectIO4, disconnect: disconnectIO4 },
  ],

  lifecycle: {
    async disconnectPresentedConnections() {
      await Promise.allSettled([disconnectPDX(), disconnectLed(), disconnectIO4()]);
    },
    async disconnectExclusiveConnections() {
      await disconnectPDX();
    },
    async tryAutoReconnectPresentedConnections() {
      await Promise.allSettled([tryAutoReconnectPDX(), tryAutoReconnectLed(), tryAutoReconnectIO4()]);
    },
    async tryAutoReconnectExclusiveConnections() {
      await tryAutoReconnectPDX();
    },
  },
};
