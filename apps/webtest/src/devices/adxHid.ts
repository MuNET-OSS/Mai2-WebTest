import { ref, shallowRef } from 'vue';

// ADX / NDX HID - button input only (replaces IO4)
// VID 0x2E3C: 1P PIDs 0x5750, 0x5767; 2P via VID 0x2E4C PID 0x5750 or VID 0x2E3C PID 0x5768
// Input report: 14+ bytes, each byte 0 or 1 (digital buttons)

const ADX_VID = 0x2E3C;
const ADX_PIDS_1P = [0x5750, 0x5767];
const ADX_VID_2P = 0x2E4C;
const ADX_PID_2P = 0x5750;
const ADX_PID_2P_ALT = 0x5768;

// Button index mapping from AdxHidInput.cs IsButtonPushed
// buttonIndex1To8 → buffer index
const BTN_INDEX_MAP: Record<number, number> = {
  1: 5, 2: 4, 3: 3, 4: 2,
  5: 9, 6: 8, 7: 7, 8: 6,
};

// Auxiliary buttons at indices 10-13
// Default mapping: 10→Select1P, 11→Service, 12→Select2P, 13→Test
const AUX_BIT_MAP: Record<number, string> = {
  10: '1P_SEL',
  11: 'SERVICE',
  12: '2P_SEL',
  13: 'TEST',
};

const ADX_STORAGE_KEY = 'autoReconnect.adx';

export const adxDevice = shallowRef<HIDDevice | null>(null);
export const adxConnected = ref(false);
export const adxButtonStates = ref<Record<string, boolean>>({});
export const adxPlayer1Buttons = ref<boolean[]>(new Array(8).fill(false));

function parseInputReport(data: DataView) {
  if (data.byteLength < 14) return;

  const states: Record<string, boolean> = {};
  const p1Buttons: boolean[] = new Array(8).fill(false);

  for (let btn = 1; btn <= 8; btn++) {
    const bufIdx = BTN_INDEX_MAP[btn];
    const pressed = data.getUint8(bufIdx) === 1;
    states[`1P_BTN${btn}`] = pressed;
    p1Buttons[btn - 1] = pressed;
  }

  for (const [idxStr, name] of Object.entries(AUX_BIT_MAP)) {
    const idx = Number(idxStr);
    if (idx < data.byteLength) {
      states[name] = data.getUint8(idx) === 1;
    }
  }

  adxButtonStates.value = states;
  adxPlayer1Buttons.value = p1Buttons;
}

function onInputReport(event: HIDInputReportEvent) {
  parseInputReport(event.data);
}

function onHidDisconnect(e: HIDConnectionEvent) {
  if (e.device === adxDevice.value) {
    adxDevice.value = null;
    adxConnected.value = false;
    adxButtonStates.value = {};
    adxPlayer1Buttons.value = new Array(8).fill(false);
  }
}

async function connectToDevice(device: HIDDevice) {
  if (!device.opened) {
    await device.open();
  }

  device.removeEventListener('inputreport', onInputReport);
  device.addEventListener('inputreport', onInputReport);

  adxDevice.value = device;
  adxConnected.value = true;

  navigator.hid.removeEventListener('disconnect', onHidDisconnect as EventListener);
  navigator.hid.addEventListener('disconnect', onHidDisconnect as EventListener);
}

function isAdxDevice(d: HIDDevice): boolean {
  if (d.vendorId === ADX_VID && ADX_PIDS_1P.includes(d.productId)) return true;
  if (d.vendorId === ADX_VID_2P && d.productId === ADX_PID_2P) return true;
  if (d.vendorId === ADX_VID && d.productId === ADX_PID_2P_ALT) return true;
  return false;
}

export async function connectADX() {
  const devices = await navigator.hid.requestDevice({
    filters: [
      { vendorId: ADX_VID, productId: ADX_PIDS_1P[0] },
      { vendorId: ADX_VID, productId: ADX_PIDS_1P[1] },
      { vendorId: ADX_VID_2P, productId: ADX_PID_2P },
      { vendorId: ADX_VID, productId: ADX_PID_2P_ALT },
    ],
  });

  const device = devices[0];
  if (!device) return;
  await connectToDevice(device);
  localStorage.setItem(ADX_STORAGE_KEY, 'true');
}

export async function disconnectADX() {
  localStorage.removeItem(ADX_STORAGE_KEY);
  if (!adxDevice.value) return;
  try {
    adxDevice.value.removeEventListener('inputreport', onInputReport as EventListener);
    await adxDevice.value.close();
  } catch (e) {
    console.error(e);
  }
  adxDevice.value = null;
  adxConnected.value = false;
  adxButtonStates.value = {};
  adxPlayer1Buttons.value = new Array(8).fill(false);
}

export async function tryAutoReconnectADX() {
  const stored = localStorage.getItem(ADX_STORAGE_KEY);
  if (!stored) return;

  const devices = await navigator.hid.getDevices();
  const device = devices.find(isAdxDevice);

  if (device) {
    try {
      await connectToDevice(device);
    } catch (e) {
      console.error('ADX auto-reconnect failed:', e);
    }
  }
}
