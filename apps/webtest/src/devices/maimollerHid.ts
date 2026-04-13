import { ref, shallowRef } from 'vue';

// Maimoller HID - all-in-one IO (touch + buttons + LED)
// VID 0x0E8F, PID 0x1224, interface mi_00
// Input report (8 bytes):
//   buf[1]: Touch A (8 bits, A1-A8)
//   buf[2]: Touch B (8 bits, B1-B8)
//   buf[3] & 0x03: Touch C (2 bits, C1-C2)
//   buf[4]: Touch D (8 bits, D1-D8)
//   buf[5]: Touch E (8 bits, E1-E8)
//   buf[6]: Player buttons (8 bits, BTN1-BTN8)
//   buf[7] & 0x0F: System buttons (bit0=COIN, bit1=SERVICE, bit2=TEST, bit3=SELECT)
// Output report (report ID 1, 63 bytes data via WebHID sendReport):
//   data[0-23]: button colors (8 buttons x 3 RGB)
//   data[24]: circle brightness, data[25]: body brightness, data[26]: side brightness
//   data[27-29]: billboard color RGB, data[30]: indicators
//   (C# indices are +1 because _reportBuffer[0] = reportId)

const MML_VID = 0x0E8F;
const MML_PID = 0x1224;
const MML_STORAGE_KEY = 'autoReconnect.maimoller';
const OUTPUT_REPORT_SIZE = 63;

const TOUCH_ZONES: { name: string; byteOffset: number; bit: number }[] = [];

for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `a${i + 1}`, byteOffset: 1, bit: i });
for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `b${i + 1}`, byteOffset: 2, bit: i });
for (let i = 0; i < 2; i++) TOUCH_ZONES.push({ name: `c${i + 1}`, byteOffset: 3, bit: i });
for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `d${i + 1}`, byteOffset: 4, bit: i });
for (let i = 0; i < 8; i++) TOUCH_ZONES.push({ name: `e${i + 1}`, byteOffset: 5, bit: i });

const SYSTEM_BIT_MAP: Record<number, string> = {
  0: 'COIN',
  1: 'SERVICE',
  2: 'TEST',
  3: '1P_SEL',
};

export const mmlDevice = shallowRef<HIDDevice | null>(null);
export const mmlConnected = ref(false);
export const mmlButtonStates = ref<Record<string, boolean>>({});
export const mmlPlayer1Buttons = ref<boolean[]>(new Array(8).fill(false));
export const mmlSelectedZones = ref<string[]>([]);

function parseInputReport(data: DataView) {
  if (data.byteLength < 8) return;

  const zones: string[] = [];
  for (const zone of TOUCH_ZONES) {
    if ((data.getUint8(zone.byteOffset) >> zone.bit) & 1) {
      zones.push(zone.name);
    }
  }
  mmlSelectedZones.value = zones;

  const playerByte = data.getUint8(6);
  const p1Buttons: boolean[] = new Array(8).fill(false);
  const states: Record<string, boolean> = {};

  for (let i = 0; i < 8; i++) {
    const pressed = ((playerByte >> i) & 1) === 1;
    states[`1P_BTN${i + 1}`] = pressed;
    p1Buttons[i] = pressed;
  }

  const systemByte = data.getUint8(7) & 0x0F;
  for (const [bitStr, name] of Object.entries(SYSTEM_BIT_MAP)) {
    states[name] = ((systemByte >> Number(bitStr)) & 1) === 1;
  }

  mmlButtonStates.value = states;
  mmlPlayer1Buttons.value = p1Buttons;
}

function onInputReport(event: HIDInputReportEvent) {
  parseInputReport(event.data);
}

function onHidDisconnect(e: HIDConnectionEvent) {
  if (e.device === mmlDevice.value) {
    mmlDevice.value = null;
    mmlConnected.value = false;
    mmlButtonStates.value = {};
    mmlPlayer1Buttons.value = new Array(8).fill(false);
    mmlSelectedZones.value = [];
  }
}

async function connectToDevice(device: HIDDevice) {
  if (!device.opened) {
    await device.open();
  }

  device.addEventListener('inputreport', onInputReport);

  mmlDevice.value = device;
  mmlConnected.value = true;

  navigator.hid.removeEventListener('disconnect', onHidDisconnect as EventListener);
  navigator.hid.addEventListener('disconnect', onHidDisconnect as EventListener);
}

export async function connectMML() {
  const devices = await navigator.hid.requestDevice({
    filters: [{ vendorId: MML_VID, productId: MML_PID }],
  });

  const device = devices[0];
  if (!device) return;
  await connectToDevice(device);
  localStorage.setItem(MML_STORAGE_KEY, 'true');
}

export async function disconnectMML() {
  localStorage.removeItem(MML_STORAGE_KEY);
  if (!mmlDevice.value) return;
  try {
    mmlDevice.value.removeEventListener('inputreport', onInputReport as EventListener);
    await mmlDevice.value.close();
  } catch (e) {
    console.error(e);
  }
  mmlDevice.value = null;
  mmlConnected.value = false;
  mmlButtonStates.value = {};
  mmlPlayer1Buttons.value = new Array(8).fill(false);
  mmlSelectedZones.value = [];
  lastOutputReport = new Uint8Array(OUTPUT_REPORT_SIZE);
}

export async function tryAutoReconnectMML() {
  const stored = localStorage.getItem(MML_STORAGE_KEY);
  if (!stored) return;

  const devices = await navigator.hid.getDevices();
  const device = devices.find(d => d.vendorId === MML_VID && d.productId === MML_PID);

  if (device) {
    try {
      await connectToDevice(device);
    } catch (e) {
      console.error('Maimoller auto-reconnect failed:', e);
    }
  }
}

let lastOutputReport: Uint8Array<ArrayBuffer> = new Uint8Array(OUTPUT_REPORT_SIZE);

function sendReport(report: Uint8Array<ArrayBuffer>) {
  lastOutputReport = new Uint8Array(report);
  return mmlDevice.value!.sendReport(1, report);
}

export async function mmlSetAllButtonColor(r: number, g: number, b: number) {
  if (!mmlDevice.value || !mmlConnected.value) return;
  const report = new Uint8Array(lastOutputReport);
  for (let i = 0; i < 8; i++) {
    report[i * 3] = r;
    report[i * 3 + 1] = g;
    report[i * 3 + 2] = b;
  }
  await sendReport(report);
}

export async function mmlSetTopLightColor(r: number, g: number, b: number) {
  if (!mmlDevice.value || !mmlConnected.value) return;
  const report = new Uint8Array(lastOutputReport);
  report[27] = Math.max(0, Math.min(255, Math.floor(r)));
  report[28] = Math.max(0, Math.min(255, Math.floor(g)));
  report[29] = Math.max(0, Math.min(255, Math.floor(b)));
  await sendReport(report);
}

export async function mmlSetFrameBrightness(value: number) {
  if (!mmlDevice.value || !mmlConnected.value) return;
  const v = Math.max(0, Math.min(255, Math.floor(value)));
  const report = new Uint8Array(lastOutputReport);
  report[24] = v;
  report[25] = v;
  report[26] = v;
  await sendReport(report);
}
