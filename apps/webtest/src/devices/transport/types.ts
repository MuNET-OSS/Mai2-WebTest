import type { DeviceMode } from '@/devices/providers/types';

export interface SerialOpenOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

export interface SerialPortMetadata {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialChannel {
  readonly id: string;
  readonly label: string;
  getInfo(): SerialPortMetadata;
  open(options: SerialOpenOptions): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): () => void;
  onDisconnect(cb: () => void): () => void;
  close(): Promise<void>;
}

export interface HidCollectionInfo {
  usagePage: number;
  usage: number;
}

export interface HidChannel {
  readonly id: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: readonly HidCollectionInfo[];
  readonly opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: Uint8Array): Promise<void>;
  /**
   * Returns feature report payload WITHOUT leading reportId byte (matching WebHID behavior).
   */
  receiveFeatureReport(reportId: number): Promise<DataView>;
  onInputReport(cb: (reportId: number, data: DataView) => void): () => void;
  onDisconnect(cb: () => void): () => void;
}

export interface UsbOpenOptions {
  configuration: number;
  interfaceNumber: number;
  inEndpoint: number;
  outEndpoint?: number;
  inPacketSize?: number;
}

export interface UsbChannel {
  readonly id: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly interfaceNumber?: number;
  open(options: UsbOpenOptions): Promise<void>;
  close(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): () => void;
  onDisconnect(cb: () => void): () => void;
}

export interface SerialDeviceCandidate {
  id: string;
  portName: string;
  friendlyName: string;
  vendorId?: number;
  productId?: number;
  location?: string;
  recommendedFor: ('touch' | 'led')[];
  recommendationReason?: string;
}

export interface HidDeviceCandidate {
  id: string;
  vendorId: number;
  productId: number;
  productName: string;
  deviceKind?: 'io4' | 'adx' | 'maimoller';
  playerSide?: '1P' | '2P';
  collections: HidCollectionInfo[];
  recommendationReason?: string;
}

export interface UsbDeviceCandidate {
  id: string;
  vendorId: number;
  productId: number;
  productName: string;
  interfaceNumber: number;
  deviceKind?: 'npro' | 'pdx';
  playerSide?: '1P' | '2P';
  location?: string;
  serialNumber?: string;
  recommendationReason?: string;
}

export interface RecommendedSetup {
  mode: DeviceMode;
  confidence: 'high' | 'medium';
  reason: string;
  autoConnect: boolean;
  playerSide?: '1P' | '2P';
  touchSerialId?: string;
  touchBaudRate?: number;
  ledSerialId?: string;
  hidDeviceId?: string;
  usbDeviceId?: string;
}

export interface AquaMaiHints {
  touchPort1p?: string;
  touchPort2p?: string;
  touchBaudRate?: number;
  ledPort1p?: string;
  ledPort2p?: string;
  adxHidEnabled?: boolean;
  maimollerEnabled?: boolean;
  pdxTouchEnabled?: boolean;
  pdxPath1p?: string;
  pdxPath2p?: string;
}

export interface DiscoveryResult {
  serialPorts: SerialDeviceCandidate[];
  hidDevices: HidDeviceCandidate[];
  usbDevices: UsbDeviceCandidate[];
  recommendedSetups: RecommendedSetup[];
  aquaMaiHints?: AquaMaiHints;
}

export interface SerialProbeResult {
  detected: 'touch' | 'led' | 'unknown';
  detail?: string;
}

export interface HardwareTransport {
  readonly kind: 'web' | 'desktop';
  discover(): Promise<DiscoveryResult | null>;
  probeSerialPort?(portName: string): Promise<SerialProbeResult>;
  requestSerialPort(hint?: { role: 'touch' | 'led' }): Promise<SerialChannel>;
  getAuthorizedSerialPorts(): Promise<SerialChannel[]>;
  openSerialPortById?(id: string): Promise<SerialChannel>;
  requestHidDevices(filters: HIDDeviceFilter[]): Promise<HidChannel[]>;
  getAuthorizedHidDevices(): Promise<HidChannel[]>;
  openHidDeviceById?(id: string): Promise<HidChannel>;
  requestUsbDevice(filters: USBDeviceFilter[]): Promise<UsbChannel>;
  getAuthorizedUsbDevices(): Promise<UsbChannel[]>;
  openUsbDeviceById?(id: string): Promise<UsbChannel>;
}
