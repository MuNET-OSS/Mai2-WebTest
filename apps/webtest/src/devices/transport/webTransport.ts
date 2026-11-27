import type {
  HardwareTransport,
  HidChannel,
  HidCollectionInfo,
  SerialChannel,
  SerialOpenOptions,
  SerialPortMetadata,
  UsbChannel,
  UsbOpenOptions,
} from './types';

let nextChannelId = 1;
const serialChannelMap = new WeakMap<SerialPort, WebSerialChannel>();
const hidChannelMap = new WeakMap<HIDDevice, WebHidChannel>();
const usbChannelMap = new WeakMap<USBDevice, WebUsbChannel>();

function wrapSerialPort(port: SerialPort): WebSerialChannel {
  let channel = serialChannelMap.get(port);
  if (!channel) {
    channel = new WebSerialChannel(port);
    serialChannelMap.set(port, channel);
  }
  return channel;
}

function wrapHidDevice(device: HIDDevice): WebHidChannel {
  let channel = hidChannelMap.get(device);
  if (!channel) {
    channel = new WebHidChannel(device);
    hidChannelMap.set(device, channel);
  }
  return channel;
}

function wrapUsbDevice(device: USBDevice): WebUsbChannel {
  let channel = usbChannelMap.get(device);
  if (!channel) {
    channel = new WebUsbChannel(device);
    usbChannelMap.set(device, channel);
  }
  return channel;
}

class WebSerialChannel implements SerialChannel {
  readonly id = `web-serial-${nextChannelId++}`;
  readonly label: string;
  private readonly port: SerialPort;
  private readonly dataListeners = new Set<(chunk: Uint8Array) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private readLoopActive = false;
  private disconnectBound = false;

  constructor(port: SerialPort) {
    this.port = port;
    const info = port.getInfo();
    if (info.usbVendorId !== undefined && info.usbProductId !== undefined) {
      const vid = info.usbVendorId.toString(16).padStart(4, '0').toUpperCase();
      const pid = info.usbProductId.toString(16).padStart(4, '0').toUpperCase();
      this.label = `USB ${vid}:${pid}`;
    } else {
      this.label = 'Serial Port';
    }
  }

  private readonly handlePortDisconnect = () => {
    this.readLoopActive = false;
    for (const cb of this.disconnectListeners) cb();
  };

  getInfo(): SerialPortMetadata {
    const info = this.port.getInfo();
    return {
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
    };
  }

  async open(options: SerialOpenOptions): Promise<void> {
    await this.port.open({
      baudRate: options.baudRate,
      dataBits: options.dataBits ?? 8,
      stopBits: options.stopBits ?? 1,
      parity: options.parity ?? 'none',
      bufferSize: options.bufferSize,
      flowControl: options.flowControl ?? 'none',
    });
    if (!this.disconnectBound) {
      this.port.addEventListener('disconnect', this.handlePortDisconnect);
      this.disconnectBound = true;
    }
    void this.startReadLoop();
  }

  private async startReadLoop() {
    if (!this.port.readable || this.readLoopActive) return;
    this.readLoopActive = true;
    try {
      this.reader = this.port.readable.getReader();
      while (this.readLoopActive) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          for (const cb of this.dataListeners) cb(value);
        }
      }
    } catch (e) {
      if (this.readLoopActive) console.error('WebSerial read error:', e);
    } finally {
      try {
        this.reader?.releaseLock();
      } catch {
        // ignore
      }
      this.reader = null;
      this.readLoopActive = false;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.port.writable) return;
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  onData(cb: (chunk: Uint8Array) => void): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  async close(): Promise<void> {
    this.readLoopActive = false;
    try {
      await this.reader?.cancel();
    } catch {
      // ignore
    }
    if (this.disconnectBound) {
      this.port.removeEventListener('disconnect', this.handlePortDisconnect);
      this.disconnectBound = false;
    }
    try {
      await this.port.close();
    } catch (e) {
      console.error(e);
    }
  }
}

class WebHidChannel implements HidChannel {
  readonly id = `web-hid-${nextChannelId++}`;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: readonly HidCollectionInfo[];
  private readonly device: HIDDevice;
  private readonly reportListeners = new Set<(reportId: number, data: DataView) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private listenersBound = false;

  constructor(device: HIDDevice) {
    this.device = device;
    this.vendorId = device.vendorId;
    this.productId = device.productId;
    this.productName = device.productName ?? '';
    this.collections = device.collections.map(c => ({
      usagePage: c.usagePage ?? 0,
      usage: c.usage ?? 0,
    }));
  }

  get opened(): boolean {
    return this.device.opened;
  }

  private readonly handleInputReport = (event: HIDInputReportEvent) => {
    for (const cb of this.reportListeners) cb(event.reportId, event.data);
  };

  private readonly handleDisconnect = (event: HIDConnectionEvent) => {
    if (event.device === this.device) {
      for (const cb of this.disconnectListeners) cb();
    }
  };

  async open(): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }
    if (!this.listenersBound) {
      this.device.addEventListener('inputreport', this.handleInputReport);
      navigator.hid.addEventListener('disconnect', this.handleDisconnect as EventListener);
      this.listenersBound = true;
    }
  }

  async close(): Promise<void> {
    if (this.listenersBound) {
      this.device.removeEventListener('inputreport', this.handleInputReport);
      navigator.hid.removeEventListener('disconnect', this.handleDisconnect as EventListener);
      this.listenersBound = false;
    }
    if (this.device.opened) {
      await this.device.close();
    }
  }

  async sendReport(reportId: number, data: Uint8Array): Promise<void> {
    await this.device.sendReport(reportId, data as Uint8Array<ArrayBuffer>);
  }

  async receiveFeatureReport(reportId: number): Promise<DataView> {
    return await this.device.receiveFeatureReport(reportId);
  }

  onInputReport(cb: (reportId: number, data: DataView) => void): () => void {
    this.reportListeners.add(cb);
    return () => this.reportListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }
}

class WebUsbChannel implements UsbChannel {
  readonly id = `web-usb-${nextChannelId++}`;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  private readonly device: USBDevice;
  private readonly dataListeners = new Set<(chunk: Uint8Array) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private openOptions: UsbOpenOptions | null = null;
  private readLoopActive = false;
  private disconnectBound = false;

  constructor(device: USBDevice) {
    this.device = device;
    this.vendorId = device.vendorId;
    this.productId = device.productId;
    this.productName = device.productName ?? '';
  }

  private readonly handleDisconnect = (event: USBConnectionEvent) => {
    if (event.device === this.device) {
      this.readLoopActive = false;
      for (const cb of this.disconnectListeners) cb();
    }
  };

  async open(options: UsbOpenOptions): Promise<void> {
    this.openOptions = options;
    await this.device.open();
    await this.device.selectConfiguration(options.configuration);
    await this.device.claimInterface(options.interfaceNumber);
    if (!this.disconnectBound) {
      navigator.usb.addEventListener('disconnect', this.handleDisconnect);
      this.disconnectBound = true;
    }
    void this.startReadLoop();
  }

  private async startReadLoop() {
    if (!this.openOptions || this.readLoopActive) return;
    const inEndpoint = this.openOptions.inEndpoint & 0x0f;
    const packetSize = this.openOptions.inPacketSize ?? 64;
    this.readLoopActive = true;
    try {
      while (this.readLoopActive) {
        const result = await this.device.transferIn(inEndpoint, packetSize);
        if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
          const chunk = new Uint8Array(
            result.data.buffer,
            result.data.byteOffset,
            result.data.byteLength,
          );
          for (const cb of this.dataListeners) cb(chunk);
        }
      }
    } catch (e) {
      if (this.readLoopActive) console.error('WebUSB read error:', e);
    } finally {
      this.readLoopActive = false;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.openOptions?.outEndpoint) return;
    const outEndpoint = this.openOptions.outEndpoint & 0x0f;
    const result = await this.device.transferOut(outEndpoint, data as Uint8Array<ArrayBuffer>);
    if (result.status !== 'ok') {
      throw new Error(`USB transferOut failed: ${result.status}`);
    }
  }

  onData(cb: (chunk: Uint8Array) => void): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  async close(): Promise<void> {
    this.readLoopActive = false;
    if (this.disconnectBound) {
      navigator.usb.removeEventListener('disconnect', this.handleDisconnect);
      this.disconnectBound = false;
    }
    try {
      if (this.openOptions) {
        await this.device.releaseInterface(this.openOptions.interfaceNumber);
      }
      await this.device.close();
    } catch (e) {
      console.error(e);
    } finally {
      this.openOptions = null;
    }
  }
}

export const webTransport: HardwareTransport = {
  kind: 'web',

  async discover() {
    return null;
  },

  async requestSerialPort() {
    const port = await navigator.serial.requestPort();
    return wrapSerialPort(port);
  },

  async getAuthorizedSerialPorts() {
    if (!('serial' in navigator)) return [];
    const ports = await navigator.serial.getPorts();
    return ports.map(wrapSerialPort);
  },

  async requestHidDevices(filters) {
    const devices = await navigator.hid.requestDevice({ filters });
    return devices.map(wrapHidDevice);
  },

  async getAuthorizedHidDevices() {
    if (!('hid' in navigator)) return [];
    const devices = await navigator.hid.getDevices();
    return devices.map(wrapHidDevice);
  },

  async requestUsbDevice(filters) {
    const device = await navigator.usb.requestDevice({ filters });
    return wrapUsbDevice(device);
  },

  async getAuthorizedUsbDevices() {
    if (!('usb' in navigator)) return [];
    const devices = await navigator.usb.getDevices();
    return devices.map(wrapUsbDevice);
  },
};
