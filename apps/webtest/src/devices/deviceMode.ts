import { useStorage } from '@vueuse/core';
import { closeSerial, touchConnected } from './touchSerial';
import { disconnectLed, ledConnected } from './ledSerial';
import { disconnectIO4, io4Connected } from './io4';
import { disconnectADX, adxConnected } from './adxHid';
import { disconnectMML, mmlConnected } from './maimollerHid';

export type DeviceMode = 'io4' | 'adx' | 'maimoller';

export const deviceMode = useStorage<DeviceMode>('deviceMode', 'io4');

export async function disconnectAllDevices() {
  const tasks: Promise<void>[] = [];
  if (touchConnected.value) tasks.push(closeSerial());
  if (ledConnected.value) tasks.push(disconnectLed());
  if (io4Connected.value) tasks.push(disconnectIO4());
  if (adxConnected.value) tasks.push(disconnectADX());
  if (mmlConnected.value) tasks.push(disconnectMML());
  await Promise.allSettled(tasks);
}
