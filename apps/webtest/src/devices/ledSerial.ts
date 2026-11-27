import { ref, shallowRef } from 'vue';
import {
  buildLedFrameBrightnessPacket,
  buildLedSetAllButtonPacket,
  buildLedUpdatePacket,
  calculateLedChecksum,
  LED_ESCAPE,
  LED_SYNC,
} from './ledProtocol';
import { getTransport, type SerialChannel } from './transport';

const LED_BAUD_RATE = 115200;

export const ledChannel = shallowRef<SerialChannel | null>(null);
export const ledConnected = ref(false);
export const ledPortLabel = ref('');
export const ledLastAck = shallowRef<number[]>([]);

let unsubData: (() => void) | null = null;
let unsubDisconnect: (() => void) | null = null;

let recvBuf: number[] = [];
let recvEscape = false;
let recvSynced = false;

function processReceivedByte(byte: number) {
  if (byte === LED_SYNC) {
    recvBuf = [];
    recvEscape = false;
    recvSynced = true;
    return;
  }
  if (!recvSynced) return;
  if (byte === LED_ESCAPE) {
    recvEscape = true;
    return;
  }
  if (recvEscape) {
    byte++;
    recvEscape = false;
  }
  recvBuf.push(byte);

  if (recvBuf.length >= 4) {
    const expectedLen = recvBuf[2] + 3;
    if (recvBuf.length === expectedLen + 1) {
      const bodyForChecksum = recvBuf.slice(0, expectedLen);
      const receivedChecksum = recvBuf[expectedLen];
      const calculatedChecksum = calculateLedChecksum(bodyForChecksum);
      if (receivedChecksum === calculatedChecksum) {
        ledLastAck.value = [...recvBuf];
      }
      recvBuf = [];
      recvSynced = false;
    }
  }
}

async function writePacket(packet: Uint8Array) {
  if (!ledChannel.value) return;
  await ledChannel.value.write(packet);
}

const LED_STORAGE_KEY = 'autoReconnect.led';

async function saveLedPortInfo(channel: SerialChannel) {
  const info = channel.getInfo();
  const ports = await getTransport().getAuthorizedSerialPorts();
  const sameDevicePorts = ports.filter(p => {
    const i = p.getInfo();
    return i.usbVendorId === info.usbVendorId && i.usbProductId === info.usbProductId;
  });
  localStorage.setItem(LED_STORAGE_KEY, JSON.stringify({
    ...info,
    sameDeviceIndex: sameDevicePorts.indexOf(channel),
  }));
}

function cleanupSubscriptions() {
  unsubData?.();
  unsubData = null;
  unsubDisconnect?.();
  unsubDisconnect = null;
}

async function connectToPort(channel: SerialChannel) {
  await channel.open({ baudRate: LED_BAUD_RATE });

  cleanupSubscriptions();
  recvBuf = [];
  recvSynced = false;
  recvEscape = false;
  ledChannel.value = channel;
  ledConnected.value = true;
  ledPortLabel.value = channel.label;

  unsubData = channel.onData(chunk => {
    for (const byte of chunk) {
      processReceivedByte(byte);
    }
  });
  unsubDisconnect = channel.onDisconnect(() => {
    cleanupSubscriptions();
    ledConnected.value = false;
    ledChannel.value = null;
    ledPortLabel.value = '';
  });
}

export async function connectLed(portId?: string) {
  const transport = getTransport();
  const channel = portId && transport.openSerialPortById
    ? await transport.openSerialPortById(portId)
    : await transport.requestSerialPort({ role: 'led' });
  await connectToPort(channel);
  if (transport.kind === 'web') {
    await saveLedPortInfo(channel);
  }
}

export async function disconnectLed() {
  const transport = getTransport();
  if (transport.kind === 'web') {
    localStorage.removeItem(LED_STORAGE_KEY);
  }
  cleanupSubscriptions();
  if (ledChannel.value) {
    try {
      await ledChannel.value.close();
    } catch (e) {
      console.error(e);
    }
  }
  ledChannel.value = null;
  ledConnected.value = false;
  ledPortLabel.value = '';
  recvBuf = [];
  recvSynced = false;
  recvEscape = false;
}

export async function setAllLedColor(r: number, g: number, b: number) {
  if (!ledChannel.value || !ledConnected.value) return;

  const setColorPacket = buildLedSetAllButtonPacket(r, g, b);
  console.log('setColorPacket', setColorPacket);
  await writePacket(setColorPacket);

  await new Promise(resolve => setTimeout(resolve, 10));

  const updatePacket = buildLedUpdatePacket();
  await writePacket(updatePacket);
}

export async function setFrameLightBrightness(value: number) {
  if (!ledChannel.value || !ledConnected.value) return;

  const packet = buildLedFrameBrightnessPacket(value);
  await writePacket(packet);
}

export async function tryAutoReconnectLed() {
  const transport = getTransport();
  if (transport.kind !== 'web') return;

  const stored = localStorage.getItem(LED_STORAGE_KEY);
  if (!stored) return;

  const savedInfo = JSON.parse(stored);
  const ports = await transport.getAuthorizedSerialPorts();
  const sameDevicePorts = ports.filter(p => {
    const info = p.getInfo();
    return info.usbVendorId === savedInfo.usbVendorId &&
      info.usbProductId === savedInfo.usbProductId;
  });
  const port = sameDevicePorts[savedInfo.sameDeviceIndex];

  if (port) {
    try {
      await connectToPort(port);
    } catch (e) {
      console.error('LED auto-reconnect failed:', e);
    }
  }
}
