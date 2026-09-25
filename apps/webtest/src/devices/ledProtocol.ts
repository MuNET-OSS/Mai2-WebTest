export const LED_SYNC = 0xE0;
export const LED_ESCAPE = 0xD0;
const DST_NODE_ID = 0x11;
const SRC_NODE_ID = 0x01;

const CMD_SET_LED_MULTI = 0x32;
const CMD_SET_LED_FET = 0x39;
const CMD_LED_UPDATE = 0x3C;

export function calculateLedChecksum(data: readonly number[]): number {
  let sum = 0;
  for (const byte of data) {
    sum = (sum + byte) & 0xFF;
  }
  return sum;
}

function escapeBytes(data: readonly number[]): number[] {
  const result: number[] = [];
  for (const byte of data) {
    if (byte === LED_SYNC || byte === LED_ESCAPE) {
      result.push(LED_ESCAPE, byte - 1);
    } else {
      result.push(byte);
    }
  }
  return result;
}

function buildPacket(command: number, payload: readonly number[]): Uint8Array<ArrayBuffer> {
  const length = 1 + payload.length;
  const rawBody = [DST_NODE_ID, SRC_NODE_ID, length, command, ...payload];
  const checksum = calculateLedChecksum(rawBody);
  const escapedBody = escapeBytes(rawBody);
  const escapedChecksum = escapeBytes([checksum]);
  return new Uint8Array([LED_SYNC, ...escapedBody, ...escapedChecksum]);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.floor(value)));
}

export function buildLedSetAllButtonPacket(r: number, g: number, b: number): Uint8Array<ArrayBuffer> {
  return buildPacket(CMD_SET_LED_MULTI, [0x00, 0x20, 0x00, clampByte(r), clampByte(g), clampByte(b), 0x00]);
}

export function buildLedFrameBrightnessPacket(value: number): Uint8Array<ArrayBuffer> {
  return buildPacket(CMD_SET_LED_FET, [clampByte(value), 0x00, 0x00]);
}

export function buildLedUpdatePacket(): Uint8Array<ArrayBuffer> {
  return buildPacket(CMD_LED_UPDATE, []);
}
