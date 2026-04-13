import { ref, shallowRef } from 'vue';

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

export const touchPort = shallowRef<SerialPort | null>(null);
export const touchConnected = ref(false);

let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let readLoopActive = false;

const SERIAL_OPTIONS: SerialOptions = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  bufferSize: 1,
  flowControl: 'none',
};

async function writeBytes(data: number[]) {
  if (!touchPort.value?.writable) return;
  const writer = touchPort.value.writable.getWriter();
  try {
    await writer.write(new Uint8Array(data));
  } finally {
    writer.releaseLock();
  }
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

async function readLoop() {
  if (!touchPort.value?.readable) return;
  readLoopActive = true;
  try {
    reader = touchPort.value.readable.getReader();
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
    if (readLoopActive) console.error('Touch read error:', e);
  } finally {
    reader?.releaseLock();
    reader = null;
  }
}

export const serialConnect = async () => {
  const port = await navigator.serial.requestPort();
  await port.open(SERIAL_OPTIONS);
  touchPort.value = port;
  touchConnected.value = true;
  readLoop();

  port.addEventListener('disconnect', () => {
    touchConnected.value = false;
    touchPort.value = null;
    readLoopActive = false;
  });

  console.log('串口已打开');
  await writeString('{HALT}');
  await writeString('{RSET}');
  await writeString('{STAT}');
};

export const closeSerial = async () => {
  console.log('closeSerial');
  if (!touchConnected.value) return;
  try {
    await writeString('{HALT}');
  } catch (e) {
    console.log(e);
  }
  readLoopActive = false;
  try {
    reader?.cancel();
  } catch (_) {}
  if (touchPort.value) {
    try {
      await touchPort.value.close();
    } catch (e) {
      console.error(e);
    }
  }
  touchPort.value = null;
  touchConnected.value = false;
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
