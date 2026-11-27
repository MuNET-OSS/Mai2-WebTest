import { ref, shallowRef } from 'vue';
import { useStorage } from '@vueuse/core';
import { mapTouchPoint, type TouchSensorMapperConfig } from './touchSensorMapper';
import { getTransport, type UsbChannel } from './transport';

// PDX Touch — WinUSB multitouch digitizer (accessed via WebUSB / Desktop WinUSB Bridge)
// VID 0x3356, PID 0x3003, configuration 1, interface 1, endpoint 2
// Packet (64 bytes): byte[0] = reportId (expect 2)
//   Then 10 touch slots × 6 bytes each starting at byte 1
//   Per slot: [status, fingerId, xLo, xHi, yLo, yHi]
//   status bit 0 = finger down

const PDX_VID = 0x3356;
const PDX_PID = 0x3003;
const PDX_REPORT_ID = 2;
const PDX_CONFIGURATION = 1;
const PDX_INTERFACE = 1;
const PDX_ENDPOINT = 2;
const PDX_PACKET_SIZE = 64;
const PDX_STORAGE_KEY = 'autoReconnect.pdx';

const PDX_MIN_X = 18432;
const PDX_MIN_Y = 0;
const PDX_MAX_X = 0;
const PDX_MAX_Y = 32767;
const PDX_FLIP = true;

export const pdxRadius = useStorage('pdx.radius', 20);
export const pdxAExtra = useStorage('pdx.aExtraRadius', 0);
export const pdxBExtra = useStorage('pdx.bExtraRadius', 25);
export const pdxCExtra = useStorage('pdx.cExtraRadius', 0);
export const pdxDExtra = useStorage('pdx.dExtraRadius', 0);
export const pdxEExtra = useStorage('pdx.eExtraRadius', 30);

function getMapperConfig(): TouchSensorMapperConfig {
  return {
    minX: PDX_MIN_X, minY: PDX_MIN_Y, maxX: PDX_MAX_X, maxY: PDX_MAX_Y,
    flip: PDX_FLIP,
    radius: pdxRadius.value,
    aExtraRadius: pdxAExtra.value,
    bExtraRadius: pdxBExtra.value,
    cExtraRadius: pdxCExtra.value,
    dExtraRadius: pdxDExtra.value,
    eExtraRadius: pdxEExtra.value,
  };
}

interface FingerState {
  active: boolean;
  zones: string[];
}

const fingers: FingerState[] = Array.from({ length: 256 }, () => ({ active: false, zones: [] }));

export const pdxChannel = shallowRef<UsbChannel | null>(null);
export const pdxConnected = ref(false);
export const pdxSelectedZones = ref<string[]>([]);

let pendingZones: string[] | undefined;
let rafScheduled = false;
let unsubData: (() => void) | null = null;
let unsubDisconnect: (() => void) | null = null;

function cleanupSubscriptions() {
  unsubData?.();
  unsubData = null;
  unsubDisconnect?.();
  unsubDisconnect = null;
}

function computeActiveZones(): string[] {
  const allZones = new Set<string>();
  for (const finger of fingers) {
    if (finger.active) {
      for (const z of finger.zones) allZones.add(z);
    }
  }
  return Array.from(allZones);
}

function scheduleUpdate() {
  pendingZones = computeActiveZones();
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      if (pendingZones !== undefined) {
        pdxSelectedZones.value = pendingZones;
        pendingZones = undefined;
      }
    });
  }
}

function parsePacket(data: DataView) {
  if (data.byteLength < 1) return;
  const reportId = data.getUint8(0);
  if (reportId !== PDX_REPORT_ID) return;

  const cfg = getMapperConfig();

  for (let i = 0; i < 10; i++) {
    const offset = i * 6 + 1;
    if (offset + 5 >= data.byteLength) break;
    const status = data.getUint8(offset);
    if (status === 0) continue;

    const isPressed = (status & 0x01) === 1;
    const fingerId = data.getUint8(offset + 1);
    if (fingerId >= 256) continue;

    if (isPressed) {
      const x = data.getUint16(offset + 2, true);
      const y = data.getUint16(offset + 4, true);
      fingers[fingerId].active = true;
      fingers[fingerId].zones = mapTouchPoint(x, y, cfg);
    } else {
      fingers[fingerId].active = false;
      fingers[fingerId].zones = [];
    }
  }

  scheduleUpdate();
}

function resetFingers() {
  for (const f of fingers) {
    f.active = false;
    f.zones = [];
  }
}

async function connectToDevice(device: UsbChannel) {
  const interfaceNumber = device.interfaceNumber ?? PDX_INTERFACE;
  const inEndpoint = interfaceNumber === 0 ? 0x81 : 0x80 | PDX_ENDPOINT;

  await device.open({
    configuration: PDX_CONFIGURATION,
    interfaceNumber,
    inEndpoint,
    inPacketSize: PDX_PACKET_SIZE,
  });

  cleanupSubscriptions();
  resetFingers();

  pdxChannel.value = device;
  pdxConnected.value = true;

  unsubData = device.onData(chunk => {
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    parsePacket(view);
  });
  unsubDisconnect = device.onDisconnect(() => {
    cleanupSubscriptions();
    pdxChannel.value = null;
    pdxConnected.value = false;
    pdxSelectedZones.value = [];
    resetFingers();
  });
}

export async function connectPDX(deviceId?: string) {
  const transport = getTransport();
  const device = deviceId && transport.openUsbDeviceById
    ? await transport.openUsbDeviceById(deviceId)
    : await transport.requestUsbDevice([
      { vendorId: PDX_VID, productId: PDX_PID },
    ]);

  await connectToDevice(device);
  if (transport.kind === 'web') {
    localStorage.setItem(PDX_STORAGE_KEY, 'true');
  }
}

export async function disconnectPDX() {
  const transport = getTransport();
  if (transport.kind === 'web') {
    localStorage.removeItem(PDX_STORAGE_KEY);
  }
  cleanupSubscriptions();
  if (pdxChannel.value) {
    try {
      await pdxChannel.value.close();
    } catch (e) {
      console.error('[PDX] disconnect error:', e);
    }
  }
  pdxChannel.value = null;
  pdxConnected.value = false;
  pdxSelectedZones.value = [];
  resetFingers();
}

export async function tryAutoReconnectPDX() {
  const transport = getTransport();
  if (transport.kind !== 'web') return;

  const stored = localStorage.getItem(PDX_STORAGE_KEY);
  if (!stored) return;

  const devices = await transport.getAuthorizedUsbDevices();
  const device = devices.find(d => d.vendorId === PDX_VID && d.productId === PDX_PID);
  if (!device) return;

  try {
    await connectToDevice(device);
  } catch (e) {
    console.error('[PDX] auto-reconnect failed:', e);
  }
}
