import type { ComputedRef, Ref } from 'vue';

export type DeviceMode = 'io4' | 'adx' | 'maimoller' | 'pdx';
export type SystemButtonName = 'SERVICE' | 'TEST' | '1P_SEL' | '2P_SEL' | 'COIN' | 'SELECT';

export interface DeviceConnection {
  key: string;
  label: string;
  hint: string | Ref<string> | ComputedRef<string>;
  connected: Ref<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface TouchCapability {
  zones: Ref<string[]>;
}

export interface ButtonCapability {
  connected: Ref<boolean>;
  player1: Ref<boolean[]>;
  states: Ref<Record<string, boolean>>;
  systemButtons: readonly SystemButtonName[];
}

export interface LightingCapability {
  available: ComputedRef<boolean>;
  topLight: {
    supported: boolean;
    available: ComputedRef<boolean>;
    setColor(r: number, g: number, b: number): Promise<void>;
  };
  buttonLight: {
    supported: boolean;
    available: ComputedRef<boolean>;
    setColor(r: number, g: number, b: number): Promise<void>;
  };
  frameLight: {
    supported: boolean;
    available: ComputedRef<boolean>;
    setBrightness(value: number): Promise<void>;
  };
}

export interface ProviderLifecycle {
  disconnectPresentedConnections(): Promise<void>;
  disconnectExclusiveConnections(): Promise<void>;
  tryAutoReconnectPresentedConnections(): Promise<void>;
  tryAutoReconnectExclusiveConnections(): Promise<void>;
}

export interface TestDeviceProvider {
  mode: DeviceMode;
  displayName: string;
  touch: TouchCapability;
  buttons: ButtonCapability;
  lighting: LightingCapability;
  connections: readonly DeviceConnection[];
  lifecycle: ProviderLifecycle;
}
