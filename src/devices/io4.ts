import { ref, shallowRef } from 'vue';

const IO4_VID = 0x0CA3;
const IO4_PID = 0x0021;
const CMD_SET_SWITCH_SAMPLING = 0x02;
const BUTTONS_OFFSET = 28;
const REPORT_SIZE = 63;

const BIT_TO_BUTTON: Record<number, string> = {
  0: '1P_BTN3', 1: '1P_SEL', 2: '1P_BTN1', 3: '1P_BTN2',
  6: 'SERVICE', 9: 'TEST',
  11: '1P_BTN8', 12: '1P_BTN7', 13: '1P_BTN6', 14: '1P_BTN5', 15: '1P_BTN4',
  16: '2P_BTN3', 18: '2P_BTN1', 19: '2P_BTN2', 20: '2P_SEL',
  27: '2P_BTN8', 28: '2P_BTN7', 29: '2P_BTN6', 30: '2P_BTN5', 31: '2P_BTN4',
};

const ACTIVE_LOW = new Set([
  '1P_BTN1', '1P_BTN2', '1P_BTN3', '1P_BTN4', '1P_BTN5', '1P_BTN6', '1P_BTN7', '1P_BTN8',
  '2P_BTN1', '2P_BTN2', '2P_BTN3', '2P_BTN4', '2P_BTN5', '2P_BTN6', '2P_BTN7', '2P_BTN8',
]);

const IO4_STORAGE_KEY = 'autoReconnect.io4';

export const io4Device = shallowRef<HIDDevice | null>(null);
export const io4Connected = ref(false);
export const buttonStates = ref<Record<string, boolean>>({});
export const player1Buttons = ref<boolean[]>(new Array(8).fill(false));

function parseInputReport(data: DataView) {
  if (data.byteLength < BUTTONS_OFFSET + 4) return;

  const raw = data.getUint32(BUTTONS_OFFSET, true);
  const states: Record<string, boolean> = {};

  for (const [bitStr, name] of Object.entries(BIT_TO_BUTTON)) {
    const bit = Number(bitStr);
    const bitValue = (raw >>> bit) & 1;
    states[name] = ACTIVE_LOW.has(name) ? bitValue === 0 : bitValue === 1;
  }

  buttonStates.value = states;

  const btnOrder = ['1P_BTN1', '1P_BTN2', '1P_BTN3', '1P_BTN4', '1P_BTN5', '1P_BTN6', '1P_BTN7', '1P_BTN8'];
  player1Buttons.value = btnOrder.map(name => states[name] ?? false);
}

function onInputReport(event: HIDInputReportEvent) {
  parseInputReport(event.data);
}

async function connectToDevice(device: HIDDevice) {
  if (!device.opened) {
    await device.open();
  }

  device.addEventListener('inputreport', onInputReport);

  const reportData = new Uint8Array(REPORT_SIZE);
  reportData[0] = CMD_SET_SWITCH_SAMPLING;
  const reportId = device.collections[0]?.outputReports?.[0]?.reportId ?? 0;
  await device.sendReport(reportId, reportData);

  io4Device.value = device;
  io4Connected.value = true;

  navigator.hid.addEventListener('disconnect', (e: HIDConnectionEvent) => {
    if (e.device === io4Device.value) {
      io4Device.value = null;
      io4Connected.value = false;
      buttonStates.value = {};
      player1Buttons.value = new Array(8).fill(false);
    }
  });
}

export async function connectIO4() {
  const devices = await navigator.hid.requestDevice({
    filters: [{ vendorId: IO4_VID, productId: IO4_PID }],
  });

  if (!devices.length) return;
  await connectToDevice(devices[0]);
  localStorage.setItem(IO4_STORAGE_KEY, 'true');
}

export async function disconnectIO4() {
  localStorage.removeItem(IO4_STORAGE_KEY);
  if (!io4Device.value) return;
  try {
    io4Device.value.removeEventListener('inputreport', onInputReport as EventListener);
    await io4Device.value.close();
  } catch (e) {
    console.error(e);
  }
  io4Device.value = null;
  io4Connected.value = false;
  buttonStates.value = {};
  player1Buttons.value = new Array(8).fill(false);
}

export async function tryAutoReconnectIO4() {
  const stored = localStorage.getItem(IO4_STORAGE_KEY);
  if (!stored) return;

  const devices = await navigator.hid.getDevices();
  const device = devices.find(d =>
    d.vendorId === IO4_VID && d.productId === IO4_PID,
  );

  if (device) {
    try {
      await connectToDevice(device);
    } catch (e) {
      console.error('IO4 auto-reconnect failed:', e);
    }
  }
}
