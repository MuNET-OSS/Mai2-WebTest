import { ref, shallowRef } from 'vue';
import {
  buildLedFrameBrightnessPacket,
  buildLedSetAllButtonPacket,
  buildLedUpdatePacket,
  calculateLedChecksum,
  LED_ESCAPE,
  LED_SYNC,
} from './ledProtocol';

const LED_BAUD_RATE = 115200;

export const ledPort = shallowRef<SerialPort | null>(null);
export const ledConnected = ref(false);
export const ledLastAck = shallowRef<number[]>([]);

let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let readLoopActive = false;

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

async function readLoop() {
  if (!ledPort.value?.readable) return;
  readLoopActive = true;
  try {
    reader = ledPort.value.readable.getReader();
    while (readLoopActive) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        for (const byte of value) {
          processReceivedByte(byte);
        }
      }
    }
  } catch (e) {
    if (readLoopActive) console.error('LED read error:', e);
  } finally {
    reader?.releaseLock();
    reader = null;
  }
}

async function writePacket(packet: Uint8Array) {
  if (!ledPort.value?.writable) return;
  const writer = ledPort.value.writable.getWriter();
  try {
    await writer.write(packet);
  } finally {
    writer.releaseLock();
  }
}

const LED_STORAGE_KEY = 'autoReconnect.led';

async function saveLedPortInfo(port: SerialPort) {
  const info = port.getInfo();
  const ports = await navigator.serial.getPorts();
  const sameDevicePorts = ports.filter(p => {
    const i = p.getInfo();
    return i.usbVendorId === info.usbVendorId && i.usbProductId === info.usbProductId;
  });
  localStorage.setItem(LED_STORAGE_KEY, JSON.stringify({
    ...info,
    sameDeviceIndex: sameDevicePorts.indexOf(port),
  }));
}

async function connectToPort(port: SerialPort) {
  await port.open({ baudRate: LED_BAUD_RATE });
  ledPort.value = port;
  ledConnected.value = true;
  readLoop();

  port.addEventListener('disconnect', () => {
    ledConnected.value = false;
    ledPort.value = null;
    readLoopActive = false;
  });
}

export async function connectLed() {
  const port = await navigator.serial.requestPort();
  await connectToPort(port);
  await saveLedPortInfo(port);
}

export async function disconnectLed() {
  localStorage.removeItem(LED_STORAGE_KEY);
  readLoopActive = false;
  try {
    reader?.cancel();
  } catch (_) {}
  if (ledPort.value) {
    try {
      await ledPort.value.close();
    } catch (e) {
      console.error(e);
    }
  }
  ledPort.value = null;
  ledConnected.value = false;
  recvBuf = [];
  recvSynced = false;
  recvEscape = false;
}

export async function setAllLedColor(r: number, g: number, b: number) {
  if (!ledPort.value || !ledConnected.value) return;

  const setColorPacket = buildLedSetAllButtonPacket(r, g, b);
  console.log('setColorPacket', setColorPacket);
  await writePacket(setColorPacket);

  await new Promise(resolve => setTimeout(resolve, 10));

  const updatePacket = buildLedUpdatePacket();
  await writePacket(updatePacket);
}

export async function setFrameLightBrightness(value: number) {
  if (!ledPort.value || !ledConnected.value) return;

  const packet = buildLedFrameBrightnessPacket(value);
  await writePacket(packet);
}

export async function tryAutoReconnectLed() {
  const stored = localStorage.getItem(LED_STORAGE_KEY);
  if (!stored) return;

  const savedInfo = JSON.parse(stored);
  const ports = await navigator.serial.getPorts();
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
