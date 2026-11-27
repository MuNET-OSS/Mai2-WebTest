import { ref, shallowRef } from 'vue';
import { getTransport, type HidChannel } from './transport';

// Maimoller HID - all-in-one IO (touch + buttons + LED)
// VID 0x0E8F, PID 0x1224
// 同一 VID:PID 下有 3 个 HID 接口，通过 featureReport(1) 识别正确设备（data[3]==2 → 2P, 否则 1P）
// Input report (reportId=1, 63 bytes data, 有效数据在前 7 字节):
//   data[0]: Touch A (8 bits, A1-A8)
//   data[1]: Touch B (8 bits, B1-B8)
//   data[2] & 0x03: Touch C (2 bits, C1-C2)
//   data[3]: Touch D (8 bits, D1-D8)
//   data[4]: Touch E (8 bits, E1-E8)
//   data[5]: Player buttons (8 bits, BTN1-BTN8)
//   data[6] & 0x0F: System buttons (bit0=COIN, bit1=SERVICE, bit2=TEST, bit3=SELECT)
// Output report (reportId=1, 63 bytes data):
//   data[0-23]: button colors (8 buttons x 3 RGB)
//   data[24]: circle brightness, data[25]: body brightness, data[26]: side brightness
//   data[27-29]: billboard color RGB, data[30]: indicators

const MML_VID = 0x0E8F;
const MML_PID = 0x1224;
const MML_REPORT_ID = 1;
const MML_STORAGE_KEY = 'autoReconnect.maimoller';
const OUTPUT_REPORT_SIZE = 63;

const TOUCH_ZONES: { name: string; byteOffset: number; bit: number }[] = [];

for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `a${i + 1}`, byteOffset: 0, bit: i });
for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `b${i + 1}`, byteOffset: 1, bit: i });
for (let i = 0; i < 2; i++) TOUCH_ZONES.push({ name: `c${i + 1}`, byteOffset: 2, bit: i });
for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `d${i + 1}`, byteOffset: 3, bit: i });
for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `e${i + 1}`, byteOffset: 4, bit: i });

const SYSTEM_BIT_MAP: Record<number, string> = {
  0: 'COIN',
  1: 'SERVICE',
  2: 'TEST',
  3: 'SELECT',
};

export const mmlChannel = shallowRef<HidChannel | null>(null);
export const mmlConnected = ref(false);
export const mmlButtonStates = ref<Record<string, boolean>>({});
export const mmlPlayer1Buttons = ref<boolean[]>(new Array(8).fill(false));
export const mmlSelectedZones = ref<string[]>([]);
export const mmlPlayerSide = ref<'1P' | '2P' | null>(null);

let inputReportCount = 0;
let unsubInput: (() => void) | null = null;
let unsubDisconnect: (() => void) | null = null;

function cleanupSubscriptions() {
  unsubInput?.();
  unsubInput = null;
  unsubDisconnect?.();
  unsubDisconnect = null;
}

function parseInputReport(reportId: number, data: DataView) {
  inputReportCount++;

  // Log first 10 reports fully, then every 500th
  if (inputReportCount <= 10 || inputReportCount % 500 === 0) {
    const raw: number[] = [];
    for (let i = 0; i < Math.min(data.byteLength, 8); i++) raw.push(data.getUint8(i));
    console.debug(
      `[MML] inputreport #${inputReportCount} reportId=${reportId} len=${data.byteLength} raw=[${raw.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`,
    );
  }

  if (data.byteLength < 7) {
    console.warn(`[MML] report too short: ${data.byteLength} bytes (need >=7)`);
    return;
  }

  const zones: string[] = [];
  for (const zone of TOUCH_ZONES) {
    if ((data.getUint8(zone.byteOffset) >> zone.bit) & 1) {
      zones.push(zone.name);
    }
  }

  if (inputReportCount <= 10 || (zones.length > 0 && zones.join(',') !== mmlSelectedZones.value.join(','))) {
    console.debug(`[MML] touch zones: [${zones.join(', ')}]`);
  }
  mmlSelectedZones.value = zones;

  const playerByte = data.getUint8(5);
  const p1Buttons: boolean[] = new Array(8).fill(false);
  const states: Record<string, boolean> = {};

  for (let i = 0; i < 8; i++) {
    const pressed = ((playerByte >> i) & 1) === 1;
    states[`1P_BTN${i + 1}`] = pressed;
    p1Buttons[i] = pressed;
  }

  const systemByte = data.getUint8(6) & 0x0F;
  for (const [bitStr, name] of Object.entries(SYSTEM_BIT_MAP)) {
    states[name] = ((systemByte >> Number(bitStr)) & 1) === 1;
  }

  const prevStates = mmlButtonStates.value;
  const changed = Object.entries(states).some(([k, v]) => prevStates[k] !== v);
  if (changed) {
    const active = Object.entries(states).filter(([, v]) => v).map(([k]) => k);
    console.debug(`[MML] buttons: [${active.join(', ')}]`);
  }

  mmlButtonStates.value = states;
  mmlPlayer1Buttons.value = p1Buttons;
}

async function findMaimollerDevice(devices: HidChannel[]): Promise<{ device: HidChannel; player: '1P' | '2P' } | null> {
  const candidates = devices.filter(d => d.vendorId === MML_VID && d.productId === MML_PID);
  console.log(`[MML] ${candidates.length} candidate(s):`, candidates.map(d => `"${d.productName}"`));

  for (const [i, d] of candidates.entries()) {
    try {
      if (!d.opened) await d.open();
      const featureData = await d.receiveFeatureReport(MML_REPORT_ID);
      const player = featureData.byteLength > 3 && featureData.getUint8(3) === 2 ? '2P' as const : '1P' as const;
      console.log(`[MML]   candidate[${i}] "${d.productName}" → featureReport OK, player=${player}`);
      return { device: d, player };
    } catch {
      console.log(`[MML]   candidate[${i}] "${d.productName}" → featureReport failed, skipping`);
      try { if (d.opened) await d.close(); } catch { /* ignore */ }
    }
  }
  return null;
}

async function connectToDevice(device: HidChannel, player: '1P' | '2P') {
  if (!device.opened) await device.open();

  cleanupSubscriptions();
  inputReportCount = 0;

  mmlChannel.value = device;
  mmlConnected.value = true;
  mmlPlayerSide.value = player;
  console.log(`[MML] connected to "${device.productName}" as ${player}`);

  unsubInput = device.onInputReport((reportId, data) => {
    parseInputReport(reportId, data);
  });
  unsubDisconnect = device.onDisconnect(() => {
    console.log('[MML] device disconnected');
    cleanupSubscriptions();
    mmlChannel.value = null;
    mmlConnected.value = false;
    mmlButtonStates.value = {};
    mmlPlayer1Buttons.value = new Array(8).fill(false);
    mmlSelectedZones.value = [];
    mmlPlayerSide.value = null;
  });
}

export async function connectMML(deviceId?: string) {
  const transport = getTransport();
  const devices = deviceId && transport.openHidDeviceById
    ? [await transport.openHidDeviceById(deviceId)]
    : await transport.requestHidDevices([{ vendorId: MML_VID, productId: MML_PID }]);

  const result = await findMaimollerDevice(devices);
  if (!result) {
    const msg = `[MML] no valid Maimoller device found among ${devices.length} device(s)`;
    console.error(msg);
    if (deviceId) {
      throw new Error('所选设备不支持 Maimoller 控制协议');
    }
    return;
  }

  await connectToDevice(result.device, result.player);
  if (transport.kind === 'web') {
    localStorage.setItem(MML_STORAGE_KEY, 'true');
  }
}

export async function disconnectMML() {
  console.log('[MML] disconnecting...');
  const transport = getTransport();
  if (transport.kind === 'web') {
    localStorage.removeItem(MML_STORAGE_KEY);
  }
  cleanupSubscriptions();
  if (mmlChannel.value) {
    try {
      await mmlChannel.value.close();
      console.log('[MML] device closed');
    } catch (e) {
      console.error('[MML] disconnect error:', e);
    }
  }
  mmlChannel.value = null;
  mmlConnected.value = false;
  mmlButtonStates.value = {};
  mmlPlayer1Buttons.value = new Array(8).fill(false);
  mmlSelectedZones.value = [];
  mmlPlayerSide.value = null;
  lastOutputReport = new Uint8Array(OUTPUT_REPORT_SIZE);
}

export async function tryAutoReconnectMML() {
  const transport = getTransport();
  if (transport.kind !== 'web') return;

  const stored = localStorage.getItem(MML_STORAGE_KEY);
  if (!stored) return;

  const devices = await transport.getAuthorizedHidDevices();
  const result = await findMaimollerDevice(devices);
  if (!result) {
    console.warn('[MML] auto-reconnect: no valid device found');
    return;
  }

  try {
    await connectToDevice(result.device, result.player);
  } catch (e) {
    console.error('[MML] auto-reconnect failed:', e);
  }
}

let lastOutputReport: Uint8Array<ArrayBuffer> = new Uint8Array(OUTPUT_REPORT_SIZE);

function sendReport(report: Uint8Array<ArrayBuffer>) {
  lastOutputReport = new Uint8Array(report);
  return mmlChannel.value!.sendReport(MML_REPORT_ID, report);
}

export async function mmlSetAllButtonColor(r: number, g: number, b: number) {
  if (!mmlChannel.value || !mmlConnected.value) return;
  const report = new Uint8Array(lastOutputReport);
  for (let i = 0; i < 8; i++) {
    report[i * 3] = r;
    report[i * 3 + 1] = g;
    report[i * 3 + 2] = b;
  }
  await sendReport(report);
}

export async function mmlSetTopLightColor(r: number, g: number, b: number) {
  if (!mmlChannel.value || !mmlConnected.value) return;
  const report = new Uint8Array(lastOutputReport);
  report[27] = Math.max(0, Math.min(255, Math.floor(r)));
  report[28] = Math.max(0, Math.min(255, Math.floor(g)));
  report[29] = Math.max(0, Math.min(255, Math.floor(b)));
  await sendReport(report);
}

export async function mmlSetFrameBrightness(value: number) {
  if (!mmlChannel.value || !mmlConnected.value) return;
  const v = Math.max(0, Math.min(255, Math.floor(value)));
  const report = new Uint8Array(lastOutputReport);
  report[24] = v;
  report[25] = v;
  report[26] = v;
  await sendReport(report);
}
