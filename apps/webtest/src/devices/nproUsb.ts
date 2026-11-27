import { ref, shallowRef } from 'vue';
import {
  buildLedFrameBrightnessPacket,
  buildLedSetAllButtonPacket,
  buildLedTopColorPacket,
  buildLedUpdatePacket,
} from './ledProtocol';
import { getTransport, type UsbChannel } from './transport';

// NPro 自定义固件：GAME 接口同时承载输入与 SEGA LED 协议（含扩展 0x3A 顶灯 RGB）。
// interface 0: 0x01 OUT / 0x81 IN，上行固定 8 字节。
// report: touch[6] little-endian bitmap + buttons + ext_buttons。

const NPRO_VID = 0x2E3C;
const NPRO_1P_PID = 0x5751;
const NPRO_2P_PID = 0x5752;
const NPRO_CONFIGURATION = 1;
const NPRO_GAME_INTERFACE = 0;
const NPRO_GAME_ENDPOINT = 1;
const NPRO_TRANSFER_SIZE = 64;
const NPRO_REPORT_SIZE = 8;
const NPRO_STORAGE_KEY = 'autoReconnect.npro';
const KEEP_ALIVE_INTERVAL_MS = 1000;

const TOUCH_ZONE_NAMES = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8',
  'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8',
  'c1', 'c2',
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8',
  'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8',
] as const;

const EXT_BUTTON_NAMES = ['1P_SEL', 'SERVICE', '2P_SEL', 'TEST'] as const;

export const nproChannel = shallowRef<UsbChannel | null>(null);
export const nproConnected = ref(false);
export const nproPlayerSide = ref<'1P' | '2P' | null>(null);
export const nproSelectedZones = ref<string[]>([]);
export const nproButtonStates = ref<Record<string, boolean>>({});
export const nproPlayer1Buttons = ref<boolean[]>(new Array(8).fill(false));

let pendingInput = new Uint8Array(0);
let keepAliveTimer: number | undefined;
let unsubData: (() => void) | null = null;
let unsubDisconnect: (() => void) | null = null;

function cleanupSubscriptions() {
  unsubData?.();
  unsubData = null;
  unsubDisconnect?.();
  unsubDisconnect = null;
}

function isNproDevice(device: UsbChannel): boolean {
  return device.vendorId === NPRO_VID
    && (device.productId === NPRO_1P_PID || device.productId === NPRO_2P_PID);
}

function playerSideForPid(pid: number): '1P' | '2P' {
  return pid === NPRO_2P_PID ? '2P' : '1P';
}

function resetState() {
  nproSelectedZones.value = [];
  nproButtonStates.value = {};
  nproPlayer1Buttons.value = new Array(8).fill(false);
}

function parseInputReport(report: Uint8Array) {
  if (report.length < NPRO_REPORT_SIZE) return;

  const zones: string[] = [];
  for (let bit = 0; bit < TOUCH_ZONE_NAMES.length; bit++) {
    if ((report[bit >> 3] >> (bit & 7)) & 1) {
      zones.push(TOUCH_ZONE_NAMES[bit]);
    }
  }

  const buttons = new Array<boolean>(8).fill(false);
  const states: Record<string, boolean> = {};
  const buttonByte = report[6];
  for (let i = 0; i < buttons.length; i++) {
    const pressed = ((buttonByte >> i) & 1) === 1;
    buttons[i] = pressed;
    states[`1P_BTN${i + 1}`] = pressed;
  }

  const extButtonByte = report[7];
  for (let i = 0; i < EXT_BUTTON_NAMES.length; i++) {
    states[EXT_BUTTON_NAMES[i]] = ((extButtonByte >> i) & 1) === 1;
  }

  nproSelectedZones.value = zones;
  nproButtonStates.value = states;
  nproPlayer1Buttons.value = buttons;
}

function appendInputData(data: Uint8Array) {
  const merged = new Uint8Array(pendingInput.length + data.length);
  merged.set(pendingInput);
  merged.set(data, pendingInput.length);

  let offset = 0;
  while (merged.length - offset >= NPRO_REPORT_SIZE) {
    parseInputReport(merged.subarray(offset, offset + NPRO_REPORT_SIZE));
    offset += NPRO_REPORT_SIZE;
  }
  pendingInput = merged.slice(offset);
}

function stopKeepAlive() {
  if (keepAliveTimer !== undefined) {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = undefined;
  }
}

function markDisconnected(device: UsbChannel) {
  if (nproChannel.value !== device) return;
  cleanupSubscriptions();
  stopKeepAlive();
  nproChannel.value = null;
  nproConnected.value = false;
  nproPlayerSide.value = null;
  pendingInput = new Uint8Array(0);
  resetState();
}

async function writePacket(packet: Uint8Array<ArrayBuffer>) {
  const device = nproChannel.value;
  if (!device || !nproConnected.value) return;

  try {
    await device.write(packet);
  } catch (error) {
    console.error('[NPro] write error:', error);
    markDisconnected(device);
  }
}

function startKeepAlive(device: UsbChannel) {
  stopKeepAlive();
  keepAliveTimer = window.setInterval(() => {
    if (nproChannel.value === device) {
      void writePacket(buildLedUpdatePacket());
    }
  }, KEEP_ALIVE_INTERVAL_MS);
}

async function connectToDevice(device: UsbChannel) {
  await device.open({
    configuration: NPRO_CONFIGURATION,
    interfaceNumber: NPRO_GAME_INTERFACE,
    inEndpoint: 0x80 | NPRO_GAME_ENDPOINT,
    outEndpoint: NPRO_GAME_ENDPOINT,
    inPacketSize: NPRO_TRANSFER_SIZE,
  });

  cleanupSubscriptions();
  pendingInput = new Uint8Array(0);
  resetState();
  nproChannel.value = device;
  nproConnected.value = true;
  nproPlayerSide.value = playerSideForPid(device.productId);

  unsubData = device.onData(chunk => {
    appendInputData(chunk);
  });
  unsubDisconnect = device.onDisconnect(() => {
    markDisconnected(device);
  });

  startKeepAlive(device);
}

export async function connectNpro(deviceId?: string) {
  const transport = getTransport();
  const device = deviceId && transport.openUsbDeviceById
    ? await transport.openUsbDeviceById(deviceId)
    : await transport.requestUsbDevice([
      { vendorId: NPRO_VID, productId: NPRO_1P_PID },
      { vendorId: NPRO_VID, productId: NPRO_2P_PID },
    ]);

  await connectToDevice(device);
  if (transport.kind === 'web') {
    localStorage.setItem(NPRO_STORAGE_KEY, 'true');
  }
}

export async function disconnectNpro() {
  const transport = getTransport();
  if (transport.kind === 'web') {
    localStorage.removeItem(NPRO_STORAGE_KEY);
  }
  cleanupSubscriptions();
  stopKeepAlive();

  const device = nproChannel.value;
  if (device) {
    try {
      await device.close();
    } catch (error) {
      console.error('[NPro] disconnect error:', error);
    }
  }

  nproChannel.value = null;
  nproConnected.value = false;
  nproPlayerSide.value = null;
  pendingInput = new Uint8Array(0);
  resetState();
}

export async function tryAutoReconnectNpro() {
  const transport = getTransport();
  if (transport.kind !== 'web') return;

  const stored = localStorage.getItem(NPRO_STORAGE_KEY);
  if (!stored) return;

  const devices = await transport.getAuthorizedUsbDevices();
  const device = devices.find(isNproDevice);
  if (!device) return;

  try {
    await connectToDevice(device);
  } catch (error) {
    console.error('[NPro] auto-reconnect failed:', error);
  }
}

export async function nproSetAllButtonColor(r: number, g: number, b: number) {
  await writePacket(buildLedSetAllButtonPacket(r, g, b));
  await writePacket(buildLedUpdatePacket());
}

export async function nproSetFrameBrightness(value: number) {
  await writePacket(buildLedFrameBrightnessPacket(value));
}

export async function nproSetTopColor(r: number, g: number, b: number) {
  await writePacket(buildLedTopColorPacket(r, g, b));
}
