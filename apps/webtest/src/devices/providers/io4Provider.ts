import { computed } from 'vue';
import type { TestDeviceProvider } from './types';
import { selectedZones, touchConnected, touchPortLabel, serialConnect, closeSerial, tryAutoReconnectTouch } from '@/devices/touchSerial';
import { ledConnected, ledPortLabel, connectLed, disconnectLed, setAllLedColor, setFrameLightBrightness, tryAutoReconnectLed } from '@/devices/ledSerial';
import { io4Connected, buttonStates, player1Buttons, connectIO4, disconnectIO4, tryAutoReconnectIO4, setTopLightColor } from '@/devices/io4';

export const io4Provider: TestDeviceProvider = {
  mode: 'io4',
  displayName: 'Onii-mai / IO4',

  touch: { zones: selectedZones },

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
      key: 'io4',
      kind: 'hid-io4',
      label: 'IO4',
      hint: 'HID Device',
      connected: io4Connected,
      connect: () => connectIO4(),
      connectById: id => connectIO4(id),
      disconnect: disconnectIO4,
    },
  ],

  lifecycle: {
    async disconnectPresentedConnections() {
      await Promise.allSettled([closeSerial(), disconnectLed(), disconnectIO4()]);
    },
    async disconnectExclusiveConnections() {
      await disconnectIO4();
    },
    async tryAutoReconnectPresentedConnections() {
      await Promise.allSettled([tryAutoReconnectTouch(), tryAutoReconnectLed(), tryAutoReconnectIO4()]);
    },
    async tryAutoReconnectExclusiveConnections() {
      await tryAutoReconnectIO4();
    },
  },
};
