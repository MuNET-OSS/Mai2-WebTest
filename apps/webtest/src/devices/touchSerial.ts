import { ref, shallowRef } from 'vue';
import { getTransport, type SerialChannel } from './transport';

const touch = {
  a1: [0, 0],
  a2: [0, 1],
  a3: [0, 2],
  a4: [0, 3],
  a5: [0, 4],
  a6: [1, 0],
  a7: [1, 1],
  a8: [1, 2],
  b1: [1, 3],
  b2: [1, 4],
  b3: [2, 0],
  b4: [2, 1],
  b5: [2, 2],
  b6: [2, 3],
  b7: [2, 4],
  b8: [3, 0],
  c1: [3, 1],
  c2: [3, 2],
  d1: [3, 3],
  d2: [3, 4],
  d3: [4, 0],
  d4: [4, 1],
  d5: [4, 2],
  d6: [4, 3],
  d7: [4, 4],
  d8: [5, 0],
  e1: [5, 1],
  e2: [5, 2],
  e3: [5, 3],
  e4: [5, 4],
  e5: [6, 0],
  e6: [6, 1],
  e7: [6, 2],
  e8: [6, 3],
} as const;

export const touchChannel = shallowRef<SerialChannel | null>(null);
export const touchConnected = ref(false);
export const touchPortLabel = ref('');

let unsubData: (() => void) | null = null;
let unsubDisconnect: (() => void) | null = null;

const SERIAL_OPTIONS = {
  baudRate: 9600,
  dataBits: 8 as const,
  stopBits: 1 as const,
  parity: 'none' as const,
  bufferSize: 1,
  flowControl: 'none' as const,
};

async function writeBytes(data: number[]) {
  if (!touchChannel.value) return;
  await touchChannel.value.write(new Uint8Array(data));
}

const writeString = (data: string) => {
  return writeBytes(data.split('').map(it => it.charCodeAt(0)));
};

let recvBuff: number[] = [];

function processReceivedByte(byte: number) {
  if (byte === 40) {
    recvBuff = [];
  } else if (byte === 41) {
    processChunk();
  } else {
    recvBuff.push(byte);
  }
}

const TOUCH_STORAGE_KEY = 'autoReconnect.touch';

async function saveTouchPortInfo(channel: SerialChannel) {
  const info = channel.getInfo();
  const ports = await getTransport().getAuthorizedSerialPorts();
  const sameDevicePorts = ports.filter(p => {
    const i = p.getInfo();
    return i.usbVendorId === info.usbVendorId && i.usbProductId === info.usbProductId;
  });
  localStorage.setItem(TOUCH_STORAGE_KEY, JSON.stringify({
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

async function connectToPort(channel: SerialChannel, baudRate?: number) {
  await channel.open({
    ...SERIAL_OPTIONS,
    baudRate: baudRate ?? SERIAL_OPTIONS.baudRate,
  });

  cleanupSubscriptions();
  recvBuff = [];
  touchChannel.value = channel;
  touchConnected.value = true;
  touchPortLabel.value = channel.label;

  unsubData = channel.onData(chunk => {
    for (const byte of chunk) {
      processReceivedByte(byte);
    }
  });
  unsubDisconnect = channel.onDisconnect(() => {
    cleanupSubscriptions();
    touchConnected.value = false;
    touchChannel.value = null;
    touchPortLabel.value = '';
    selectedZones.value = [];
  });

  console.log('串口已打开');
  await writeString('{HALT}');
  await writeString('{RSET}');
  await writeString('{STAT}');
}

export const serialConnect = async (portId?: string, baudRate?: number) => {
  const transport = getTransport();
  const channel = portId && transport.openSerialPortById
    ? await transport.openSerialPortById(portId)
    : await transport.requestSerialPort({ role: 'touch' });
  await connectToPort(channel, baudRate);
  if (transport.kind === 'web') {
    await saveTouchPortInfo(channel);
  }
};

export const closeSerial = async () => {
  console.log('closeSerial');
  const transport = getTransport();
  if (transport.kind === 'web') {
    localStorage.removeItem(TOUCH_STORAGE_KEY);
  }
  if (!touchConnected.value && !touchChannel.value) return;
  try {
    await writeString('{HALT}');
  } catch (e) {
    console.log(e);
  }
  cleanupSubscriptions();
  if (touchChannel.value) {
    try {
      await touchChannel.value.close();
    } catch (e) {
      console.error(e);
    }
  }
  touchChannel.value = null;
  touchConnected.value = false;
  touchPortLabel.value = '';
  selectedZones.value = [];
};

export const selectedZones = ref<string[]>([]);
export const lastBuffer = shallowRef<number[]>([]);

const processChunk = () => {
  if (recvBuff.length !== 7) {
    console.error('Received chunk is not complete:', recvBuff);
    recvBuff = [];
    return;
  }
  lastBuffer.value = recvBuff;
  const pressed: (keyof typeof touch)[] = [];
  for (const [area, offset] of Object.entries(touch)) {
    if (check(recvBuff, offset)) {
      pressed.push(area as any);
    }
  }
  if (pressed.length) {
    console.log('Received chunk', pressed);
  }
  selectedZones.value = pressed;
};

const check = (data: readonly number[], offset: readonly [number, number]) => ((data[offset[0]] >> offset[1]) & 1) != 0;

export async function tryAutoReconnectTouch() {
  const transport = getTransport();
  if (transport.kind !== 'web') return;

  const stored = localStorage.getItem(TOUCH_STORAGE_KEY);
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
      console.error('Touch auto-reconnect failed:', e);
    }
  }
}
