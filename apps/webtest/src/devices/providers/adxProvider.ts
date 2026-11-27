import { computed } from 'vue';
import type { TestDeviceProvider } from './types';
import { selectedZones, touchConnected, touchPortLabel, serialConnect, closeSerial, tryAutoReconnectTouch } from '@/devices/touchSerial';
import { ledConnected, ledPortLabel, connectLed, disconnectLed, setAllLedColor, setFrameLightBrightness, tryAutoReconnectLed } from '@/devices/ledSerial';
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
    {
      key: 'touch',
      kind: 'serial-touch',
      label: 'Touch',
      hint: computed(() => touchPortLabel.value || 'COM3 / COM4'),
      connected: touchConnected,
      connect: () => serialConnect(),
      connectById: (id, opts) => serialConnect(id, opts?.baudRate),
      disconnect: closeSerial,
    },
    {
      key: 'led',
      kind: 'serial-led',
      label: 'LED',
      hint: computed(() => ledPortLabel.value || 'COM21 / COM23'),
      connected: ledConnected,
      connect: () => connectLed(),
      connectById: id => connectLed(id),
      disconnect: disconnectLed,
    },
    {
      key: 'adx',
      kind: 'hid-adx',
      label: 'ADX / NDX',
      hint: 'HID Device',
      connected: adxConnected,
      connect: () => connectADX(),
      connectById: id => connectADX(id),
      disconnect: disconnectADX,
    },
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
