import { ref, shallowRef } from 'vue';
import VueSerial from 'vue-serial';

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

export const serial = new VueSerial();
serial.baudRate = 9600;
serial.dataBits = 8;
serial.stopBits = 1;
serial.parity = 'none';
serial.bufferSize = 1; // set to 1 to receive byte-per-byte
serial.flowControl = 'none';

const writeString = (data: string) => {
  return serial.write(data.split('').map(it => it.charCodeAt(0)));
};

export const serialConnect = async () => {
  await serial.connect(undefined);
  if (serial.isOpen) {
    console.log('串口已打开');
    await writeString(`{HALT}`);
    await writeString(`{RSET}`);
    await writeString(`{STAT}`);
  }
};

export const closeSerial = async () => {
  console.log('closeSerial');
  if (!serial.isOpen) return;
  try {
    await writeString('{HALT}');
  }
  catch (e) {
    console.log(e);
  }
  await serial.close();
};


let recvBuff: number[] = [];

const onReceiveFunction = ({ value }: { value: Uint8Array }) => {
  for (const byte of value) {
    if (byte === 40) {
      recvBuff = [];
    }
    else if (byte === 41) {
      processChunk();
    }
    else {
      recvBuff.push(byte);
    }
  }
};

serial.addEventListener('read', onReceiveFunction as any);

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
