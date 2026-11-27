import type {
  DiscoveryResult,
  HardwareTransport,
  HidChannel,
  HidCollectionInfo,
  HidDeviceCandidate,
  SerialChannel,
  SerialDeviceCandidate,
  SerialOpenOptions,
  SerialPortMetadata,
  SerialProbeResult,
  UsbChannel,
  UsbDeviceCandidate,
  UsbOpenOptions,
} from './types';

function toWsBase(httpBase: string): string {
  const resolved = httpBase
    ? new URL(httpBase, location.href)
    : new URL(location.origin);
  resolved.protocol = resolved.protocol === 'https:' ? 'wss:' : 'ws:';
  return resolved.toString().replace(/\/$/, '');
}

function toHttpBase(httpBase: string): string {
  return httpBase ? httpBase.replace(/\/$/, '') : '';
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface WsHandshakeControl {
  ws: WebSocket;
  waitReady(): Promise<void>;
}

function openWebSocketWithHandshake(
  url: string,
  onBinary: (buf: ArrayBuffer) => void,
  onText: (msg: Record<string, unknown>) => void,
  onDisconnected: () => void,
): WsHandshakeControl {
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  let settled = false;
  let resolveReady!: () => void;
  let rejectReady!: (err: Error) => void;
  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  ws.onmessage = (event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      onBinary(event.data);
      return;
    }
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        if (!settled) {
          if (msg.type === 'ready') {
            settled = true;
            resolveReady();
            return;
          }
          if (msg.type === 'error') {
            settled = true;
            rejectReady(new Error(String(msg.message ?? '设备打开失败')));
            try { ws.close(); } catch { /* ignore */ }
            return;
          }
        }
        if (msg.type === 'disconnected') {
          onDisconnected();
          return;
        }
        onText(msg);
      } catch (e) {
        console.error('DesktopBridge control message parse error:', e);
      }
    }
  };

  ws.onerror = () => {
    if (!settled) {
      settled = true;
      rejectReady(new Error('WebSocket 连接设备桥失败'));
    }
  };

  ws.onclose = (event) => {
    if (!settled) {
      settled = true;
      rejectReady(new Error(event.reason || '设备连接在就绪前关闭'));
    } else {
      onDisconnected();
    }
  };

  return {
    ws,
    waitReady: () => readyPromise,
  };
}

class DesktopSerialChannel implements SerialChannel {
  readonly id: string;
  readonly label: string;
  private readonly wsBase: string;
  private readonly candidate: SerialDeviceCandidate;
  private readonly dataListeners = new Set<(chunk: Uint8Array) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private closingByClient = false;

  constructor(wsBase: string, candidate: SerialDeviceCandidate) {
    this.wsBase = wsBase;
    this.candidate = candidate;
    this.id = candidate.id;
    this.label = candidate.portName;
  }

  getInfo(): SerialPortMetadata {
    return {
      usbVendorId: this.candidate.vendorId,
      usbProductId: this.candidate.productId,
    };
  }

  async open(options: SerialOpenOptions): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.closingByClient = false;

    const params = new URLSearchParams({
      portName: this.candidate.portName,
      baudRate: String(options.baudRate),
      dataBits: String(options.dataBits ?? 8),
      stopBits: String(options.stopBits ?? 1),
      parity: options.parity ?? 'none',
    });
    const url = `${this.wsBase}/MaiChartManagerServlet/HardwareBridgeSerialWsApi?${params.toString()}`;

    const { ws, waitReady } = openWebSocketWithHandshake(
      url,
      buf => {
        const chunk = new Uint8Array(buf);
        for (const cb of this.dataListeners) cb(chunk);
      },
      () => {},
      () => {
        this.ws = null;
        if (!this.closingByClient) {
          for (const cb of this.disconnectListeners) cb();
        }
      },
    );

    this.ws = ws;
    try {
      await waitReady();
    } catch (e) {
      this.ws = null;
      throw e;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(data as Uint8Array<ArrayBuffer>);
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
    this.closingByClient = true;
    const ws = this.ws;
    this.ws = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  }
}

class DesktopHidChannel implements HidChannel {
  readonly id: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: readonly HidCollectionInfo[];
  private readonly wsBase: string;
  private readonly reportListeners = new Set<(reportId: number, data: DataView) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private readonly pendingFeatureRequests = new Map<number, {
    resolve: (view: DataView) => void;
    reject: (err: Error) => void;
  }>();
  private ws: WebSocket | null = null;
  private closingByClient = false;
  private nextReqId = 1;

  constructor(wsBase: string, candidate: HidDeviceCandidate) {
    this.wsBase = wsBase;
    this.id = candidate.id;
    this.vendorId = candidate.vendorId;
    this.productId = candidate.productId;
    this.productName = candidate.productName;
    this.collections = candidate.collections;
  }

  get opened(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private rejectAllPending(reason: string) {
    for (const pending of this.pendingFeatureRequests.values()) {
      pending.reject(new Error(reason));
    }
    this.pendingFeatureRequests.clear();
  }

  async open(): Promise<void> {
    if (this.opened) return;
    this.closingByClient = false;

    const params = new URLSearchParams({ deviceId: this.id });
    const url = `${this.wsBase}/MaiChartManagerServlet/HardwareBridgeHidWsApi?${params.toString()}`;

    const { ws, waitReady } = openWebSocketWithHandshake(
      url,
      buf => {
        if (buf.byteLength < 1) return;
        const bytes = new Uint8Array(buf);
        const reportId = bytes[0];
        const payload = new DataView(buf, 1);
        for (const cb of this.reportListeners) cb(reportId, payload);
      },
      msg => {
        if (msg.type === 'featureReport') {
          const reqId = Number(msg.reqId);
          const pending = this.pendingFeatureRequests.get(reqId);
          if (!pending) return;
          this.pendingFeatureRequests.delete(reqId);
          if (msg.ok) {
            const bytes = base64ToUint8Array(String(msg.dataBase64 ?? ''));
            pending.resolve(new DataView(bytes.buffer));
          } else {
            pending.reject(new Error(String(msg.error ?? '读取 FeatureReport 失败')));
          }
        }
      },
      () => {
        this.ws = null;
        this.rejectAllPending('HID 设备连接已断开');
        if (!this.closingByClient) {
          for (const cb of this.disconnectListeners) cb();
        }
      },
    );

    this.ws = ws;
    try {
      await waitReady();
    } catch (e) {
      this.ws = null;
      throw e;
    }
  }

  async close(): Promise<void> {
    this.closingByClient = true;
    this.rejectAllPending('HID 设备已关闭');
    const ws = this.ws;
    this.ws = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  }

  async sendReport(reportId: number, data: Uint8Array): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const frame = new Uint8Array(2 + data.length);
    frame[0] = 0x01;
    frame[1] = reportId & 0xff;
    frame.set(data, 2);
    this.ws.send(frame);
  }

  async receiveFeatureReport(reportId: number): Promise<DataView> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('HID 设备未打开');
    }
    const reqId = (this.nextReqId++) & 0xff;
    return await new Promise<DataView>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (this.pendingFeatureRequests.delete(reqId)) {
          reject(new Error('读取 FeatureReport 超时'));
        }
      }, 2000);
      this.pendingFeatureRequests.set(reqId, {
        resolve: view => {
          window.clearTimeout(timer);
          resolve(view);
        },
        reject: err => {
          window.clearTimeout(timer);
          reject(err);
        },
      });
      this.ws!.send(new Uint8Array([0x02, reqId, reportId & 0xff]));
    });
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

class DesktopUsbChannel implements UsbChannel {
  readonly id: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly interfaceNumber: number;
  private readonly wsBase: string;
  private readonly dataListeners = new Set<(chunk: Uint8Array) => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private closingByClient = false;

  constructor(wsBase: string, candidate: UsbDeviceCandidate) {
    this.wsBase = wsBase;
    this.id = candidate.id;
    this.vendorId = candidate.vendorId;
    this.productId = candidate.productId;
    this.productName = candidate.productName;
    this.interfaceNumber = candidate.interfaceNumber;
  }

  async open(options: UsbOpenOptions): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.closingByClient = false;

    const params = new URLSearchParams({
      deviceId: this.id,
      inEndpoint: String(options.inEndpoint),
      inPacketSize: String(options.inPacketSize ?? 64),
    });
    if (options.outEndpoint !== undefined) {
      params.set('outEndpoint', String(options.outEndpoint));
    }
    const url = `${this.wsBase}/MaiChartManagerServlet/HardwareBridgeUsbWsApi?${params.toString()}`;

    const { ws, waitReady } = openWebSocketWithHandshake(
      url,
      buf => {
        const chunk = new Uint8Array(buf);
        for (const cb of this.dataListeners) cb(chunk);
      },
      () => {},
      () => {
        this.ws = null;
        if (!this.closingByClient) {
          for (const cb of this.disconnectListeners) cb();
        }
      },
    );

    this.ws = ws;
    try {
      await waitReady();
    } catch (e) {
      this.ws = null;
      throw e;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(data as Uint8Array<ArrayBuffer>);
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
    this.closingByClient = true;
    const ws = this.ws;
    this.ws = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  }
}

function matchesHidFilter(candidate: HidDeviceCandidate, filters: HIDDeviceFilter[]): boolean {
  if (!filters.length) return true;
  return filters.some(f => {
    if (f.vendorId !== undefined && candidate.vendorId !== f.vendorId) return false;
    if (f.productId !== undefined && candidate.productId !== f.productId) return false;
    if (f.usagePage !== undefined || f.usage !== undefined) {
      const hasUsage = candidate.collections.some(c =>
        (f.usagePage === undefined || c.usagePage === f.usagePage) &&
        (f.usage === undefined || c.usage === f.usage),
      );
      if (!hasUsage) return false;
    }
    return true;
  });
}

function matchesUsbFilter(candidate: UsbDeviceCandidate, filters: USBDeviceFilter[]): boolean {
  if (!filters.length) return true;
  return filters.some(f => {
    if (f.vendorId !== undefined && candidate.vendorId !== f.vendorId) return false;
    if (f.productId !== undefined && candidate.productId !== f.productId) return false;
    return true;
  });
}

export function createDesktopTransport(baseUrl: string): HardwareTransport {
  const httpBase = toHttpBase(baseUrl);
  const wsBase = toWsBase(baseUrl);
  let lastDiscovery: DiscoveryResult | null = null;

  async function discover(): Promise<DiscoveryResult | null> {
    const res = await fetch(`${httpBase}/MaiChartManagerServlet/HardwareBridgeDiscoverApi`);
    if (!res.ok) {
      throw new Error(`枚举设备失败 (HTTP ${res.status})`);
    }
    const data = (await res.json()) as DiscoveryResult;
    lastDiscovery = data;
    return data;
  }

  async function ensureDiscovery(): Promise<DiscoveryResult> {
    return lastDiscovery ?? (await discover())!;
  }

  return {
    kind: 'desktop',
    discover,

    async probeSerialPort(portName: string): Promise<SerialProbeResult> {
      const params = new URLSearchParams({ portName });
      const res = await fetch(`${httpBase}/MaiChartManagerServlet/HardwareBridgeProbeSerialApi?${params.toString()}`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`探测串口失败 (HTTP ${res.status})`);
      }
      return (await res.json()) as SerialProbeResult;
    },

    async openSerialPortById(id: string): Promise<SerialChannel> {
      let data = await ensureDiscovery();
      let candidate = data.serialPorts.find(p => p.id === id || p.portName === id);
      if (!candidate) {
        data = (await discover())!;
        candidate = data.serialPorts.find(p => p.id === id || p.portName === id);
      }
      if (!candidate) {
        throw new Error(`未找到串口 ${id}`);
      }
      return new DesktopSerialChannel(wsBase, candidate);
    },

    async requestSerialPort(hint?: { role: 'touch' | 'led' }): Promise<SerialChannel> {
      const data = await discover();
      const ports = data?.serialPorts ?? [];
      if (!ports.length) {
        throw new Error('未检测到可用串口');
      }
      const preferred = hint
        ? ports.find(p => p.recommendedFor.includes(hint.role))
        : undefined;
      return new DesktopSerialChannel(wsBase, preferred ?? ports[0]);
    },

    async getAuthorizedSerialPorts(): Promise<SerialChannel[]> {
      const data = await ensureDiscovery();
      return data.serialPorts.map(p => new DesktopSerialChannel(wsBase, p));
    },

    async openHidDeviceById(id: string): Promise<HidChannel> {
      let data = await ensureDiscovery();
      let candidate = data.hidDevices.find(d => d.id === id);
      if (!candidate) {
        data = (await discover())!;
        candidate = data.hidDevices.find(d => d.id === id);
      }
      if (!candidate) {
        throw new Error(`未找到 HID 设备 ${id}`);
      }
      return new DesktopHidChannel(wsBase, candidate);
    },

    async requestHidDevices(filters: HIDDeviceFilter[]): Promise<HidChannel[]> {
      const data = await discover();
      const matched = (data?.hidDevices ?? []).filter(d => matchesHidFilter(d, filters));
      if (!matched.length) {
        throw new Error('未检测到匹配的 HID 设备');
      }
      return matched.map(d => new DesktopHidChannel(wsBase, d));
    },

    async getAuthorizedHidDevices(): Promise<HidChannel[]> {
      const data = await ensureDiscovery();
      return data.hidDevices.map(d => new DesktopHidChannel(wsBase, d));
    },

    async openUsbDeviceById(id: string): Promise<UsbChannel> {
      let data = await ensureDiscovery();
      let candidate = data.usbDevices.find(d => d.id === id);
      if (!candidate) {
        data = (await discover())!;
        candidate = data.usbDevices.find(d => d.id === id);
      }
      if (!candidate) {
        throw new Error(`未找到 USB 设备 ${id}`);
      }
      return new DesktopUsbChannel(wsBase, candidate);
    },

    async requestUsbDevice(filters: USBDeviceFilter[]): Promise<UsbChannel> {
      const data = await discover();
      const matched = (data?.usbDevices ?? []).filter(d => matchesUsbFilter(d, filters));
      if (!matched.length) {
        throw new Error('未检测到匹配的 WinUSB 设备');
      }
      return new DesktopUsbChannel(wsBase, matched[0]);
    },

    async getAuthorizedUsbDevices(): Promise<UsbChannel[]> {
      const data = await ensureDiscovery();
      return data.usbDevices.map(d => new DesktopUsbChannel(wsBase, d));
    },
  };
}
