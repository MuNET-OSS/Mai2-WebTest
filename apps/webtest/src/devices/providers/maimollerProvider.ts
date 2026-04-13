import { computed } from 'vue';
import type { TestDeviceProvider } from './types';
import {
  mmlConnected, mmlButtonStates, mmlPlayer1Buttons, mmlSelectedZones,
  mmlPlayerSide,
  connectMML, disconnectMML, tryAutoReconnectMML,
  mmlSetTopLightColor, mmlSetAllButtonColor, mmlSetFrameBrightness,
} from '@/devices/maimollerHid';

export const maimollerProvider: TestDeviceProvider = {
  mode: 'maimoller',
  displayName: 'Maimoller',

  touch: { zones: mmlSelectedZones },

  buttons: {
    connected: mmlConnected,
    player1: mmlPlayer1Buttons,
    states: mmlButtonStates,
    systemButtons: ['COIN', 'SERVICE', 'TEST', 'SELECT'],
  },

  lighting: {
    available: computed(() => mmlConnected.value),
    topLight: {
      supported: true,
      available: computed(() => mmlConnected.value),
      async setColor(r, g, b) { if (mmlConnected.value) await mmlSetTopLightColor(r, g, b); },
    },
    buttonLight: {
      supported: true,
      available: computed(() => mmlConnected.value),
      async setColor(r, g, b) { if (mmlConnected.value) await mmlSetAllButtonColor(r, g, b); },
    },
    frameLight: {
      supported: true,
      available: computed(() => mmlConnected.value),
      async setBrightness(v) { if (mmlConnected.value) await mmlSetFrameBrightness(v); },
    },
  },

  connections: [
    { key: 'mml', label: 'Maimoller', hint: computed(() => mmlPlayerSide.value ? `HID Device · ${mmlPlayerSide.value}` : 'HID Device'), connected: mmlConnected, connect: connectMML, disconnect: disconnectMML },
  ],

  lifecycle: {
    async disconnectPresentedConnections() {
      await disconnectMML();
    },
    async disconnectExclusiveConnections() {
      await disconnectMML();
    },
    async tryAutoReconnectPresentedConnections() {
      await tryAutoReconnectMML();
    },
    async tryAutoReconnectExclusiveConnections() {
      await tryAutoReconnectMML();
    },
  },
};
