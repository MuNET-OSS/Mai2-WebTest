import { ref, shallowRef } from 'vue';
import { buildLedFrameBrightnessPacket, buildLedSetAllButtonPacket, buildLedUpdatePacket } from './ledProtocol';

// NPro 自定义固件：GAME 接口同时承载输入与 SEGA LED 协议。
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

export const nproDevice = shallowRef<USBDevice | null>(null);
export const nproConnected = ref(false);
export const nproPlayerSide = ref<'1P' | '2P' | null>(null);
export const nproSelectedZones = ref<string[]>([]);
export const nproButtonStates = ref<Record<string, boolean>>({});
export const nproPlayer1Buttons = ref<boolean[]>(new Array(8).fill(false));

let readLoopActive = false;
let pendingInput = new Uint8Array(0);
let keepAliveTimer: number | undefined;

function isNproDevice(device: USBDevice): boolean {
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

function markDisconnected(device: USBDevice) {
  if (nproDevice.value !== device) return;
  readLoopActive = false;
  stopKeepAlive();
  nproDevice.value = null;
  nproConnected.value = false;
  nproPlayerSide.value = null;
  pendingInput = new Uint8Array(0);
  resetState();
}

function onUsbDisconnect(event: USBConnectionEvent) {
  markDisconnected(event.device);
}

async function writePacket(packet: Uint8Array<ArrayBuffer>) {
  const device = nproDevice.value;
  if (!device || !nproConnected.value) return;

  try {
    const result = await device.transferOut(NPRO_GAME_ENDPOINT, packet);
    if (result.status !== 'ok') {
      markDisconnected(device);
    }
  } catch (error) {
    console.error('[NPro] write error:', error);
    markDisconnected(device);
  }
}

function startKeepAlive(device: USBDevice) {
  stopKeepAlive();
  keepAliveTimer = window.setInterval(() => {
    if (nproDevice.value === device) {
      void writePacket(buildLedUpdatePacket());
    }
  }, KEEP_ALIVE_INTERVAL_MS);
}

async function readLoop(device: USBDevice) {
  readLoopActive = true;
  try {
    while (readLoopActive && nproDevice.value === device) {
      const result = await device.transferIn(NPRO_GAME_ENDPOINT, NPRO_TRANSFER_SIZE);
      if (result.status !== 'ok' || !result.data) continue;

      appendInputData(new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength));
    }
  } catch (error) {
    if (readLoopActive) {
      console.error('[NPro] read error:', error);
    }
  } finally {
    markDisconnected(device);
  }
}

async function connectToDevice(device: USBDevice) {
  await device.open();
  await device.selectConfiguration(NPRO_CONFIGURATION);
  await device.claimInterface(NPRO_GAME_INTERFACE);

  pendingInput = new Uint8Array(0);
  resetState();
  nproDevice.value = device;
  nproConnected.value = true;
  nproPlayerSide.value = playerSideForPid(device.productId);

  navigator.usb.removeEventListener('disconnect', onUsbDisconnect);
  navigator.usb.addEventListener('disconnect', onUsbDisconnect);

  startKeepAlive(device);
  void readLoop(device);
}

export async function connectNpro() {
  const device = await navigator.usb.requestDevice({
    filters: [
      { vendorId: NPRO_VID, productId: NPRO_1P_PID },
      { vendorId: NPRO_VID, productId: NPRO_2P_PID },
    ],
  });

  await connectToDevice(device);
  localStorage.setItem(NPRO_STORAGE_KEY, 'true');
}

export async function disconnectNpro() {
  localStorage.removeItem(NPRO_STORAGE_KEY);
  readLoopActive = false;
  stopKeepAlive();

  const device = nproDevice.value;
  if (device) {
    try {
      await device.releaseInterface(NPRO_GAME_INTERFACE);
      await device.close();
    } catch (error) {
      console.error('[NPro] disconnect error:', error);
    }
  }

  nproDevice.value = null;
  nproConnected.value = false;
  nproPlayerSide.value = null;
  pendingInput = new Uint8Array(0);
  resetState();
}

export async function tryAutoReconnectNpro() {
  const stored = localStorage.getItem(NPRO_STORAGE_KEY);
  if (!stored) return;

  const devices = await navigator.usb.getDevices();
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
