import { computed } from 'vue';
import type { TestDeviceProvider } from './types';
import { selectedZones, touchConnected, serialConnect, closeSerial, tryAutoReconnectTouch } from '@/devices/touchSerial';
import { ledConnected, connectLed, disconnectLed, setAllLedColor, setFrameLightBrightness, tryAutoReconnectLed } from '@/devices/ledSerial';
import { adxConnected, adxButtonStates, adxPlayer1Buttons, connectADX, disconnectADX, tryAutoReconnectADX } from '@/devices/adxHid';

export const adxProvider: TestDeviceProvider = {
  mode: 'adx',
  displayName: 'ADX / NDX HID',

  touch: { zones: selectedZones },

  buttons: {
    connected: adxConnected,
    player1: adxPlayer1Buttons,
    states: adxButtonStates,
    systemButtons: ['SERVICE', 'TEST', '1P_SEL', '2P_SEL'],
  },

  lighting: {
    available: computed(() => ledConnected.value),
    topLight: {
      supported: false,
      available: computed(() => false),
      async setColor() {},
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
    { key: 'touch', label: 'Touch', hint: 'COM3 / COM4', connected: touchConnected, connect: serialConnect, disconnect: closeSerial },
    { key: 'led', label: 'LED', hint: 'COM21 / COM23', connected: ledConnected, connect: connectLed, disconnect: disconnectLed },
    { key: 'adx', label: 'ADX / NDX', hint: 'HID Device', connected: adxConnected, connect: connectADX, disconnect: disconnectADX },
  ],

  lifecycle: {
    async disconnectPresentedConnections() {
      await Promise.allSettled([closeSerial(), disconnectLed(), disconnectADX()]);
    },
    async disconnectExclusiveConnections() {
      await disconnectADX();
    },
    async tryAutoReconnectPresentedConnections() {
      await Promise.allSettled([tryAutoReconnectTouch(), tryAutoReconnectLed(), tryAutoReconnectADX()]);
    },
    async tryAutoReconnectExclusiveConnections() {
      await tryAutoReconnectADX();
    },
  },
};
