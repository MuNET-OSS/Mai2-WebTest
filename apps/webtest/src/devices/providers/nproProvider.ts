import { computed } from 'vue';
import type { TestDeviceProvider } from './types';
import {
  nproButtonStates,
  nproConnected,
  nproPlayer1Buttons,
  nproPlayerSide,
  nproSelectedZones,
  connectNpro,
  disconnectNpro,
  tryAutoReconnectNpro,
  nproSetAllButtonColor,
  nproSetFrameBrightness,
} from '@/devices/nproUsb';

export const nproProvider: TestDeviceProvider = {
  mode: 'npro',
  displayName: 'NPro WinUSB',

  touch: { zones: nproSelectedZones },

  buttons: {
    connected: nproConnected,
    player1: nproPlayer1Buttons,
    states: nproButtonStates,
    systemButtons: ['SERVICE', 'TEST', '1P_SEL', '2P_SEL'],
  },

  lighting: {
    available: computed(() => nproConnected.value),
    topLight: {
      supported: false,
      available: computed(() => false),
      async setColor() {},
    },
    buttonLight: {
      supported: true,
      available: computed(() => nproConnected.value),
      async setColor(r, g, b) {
        if (nproConnected.value) await nproSetAllButtonColor(r, g, b);
      },
    },
    frameLight: {
      supported: true,
      available: computed(() => nproConnected.value),
      async setBrightness(value) {
        if (nproConnected.value) await nproSetFrameBrightness(value);
      },
    },
  },

  connections: [
    {
      key: 'npro',
      label: 'NPro GAME',
      hint: computed(() => nproPlayerSide.value ? `WinUSB GAME · ${nproPlayerSide.value}` : 'WinUSB GAME'),
      connected: nproConnected,
      connect: connectNpro,
      disconnect: disconnectNpro,
    },
  ],

  lifecycle: {
    async disconnectPresentedConnections() {
      await disconnectNpro();
    },
    async disconnectExclusiveConnections() {
      await disconnectNpro();
    },
    async tryAutoReconnectPresentedConnections() {
      await tryAutoReconnectNpro();
    },
    async tryAutoReconnectExclusiveConnections() {
      await tryAutoReconnectNpro();
    },
  },
};
