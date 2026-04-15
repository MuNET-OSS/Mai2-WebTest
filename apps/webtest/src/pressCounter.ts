import { reactive, watch } from 'vue';
import { activeDevice } from './devices/deviceMode';

export const touchCounters = reactive<Record<string, number>>({});
export const buttonCounters = reactive<number[]>(new Array(8).fill(0));

let prevZones = new Set<string>();
let prevButtons: boolean[] = new Array(8).fill(false);

watch(
  () => activeDevice.value.touch.zones.value,
  (zones) => {
    for (const zone of zones) {
      if (!prevZones.has(zone)) {
        touchCounters[zone] = (touchCounters[zone] || 0) + 1;
      }
    }
    prevZones = new Set(zones);
  },
);

watch(
  () => [...activeDevice.value.buttons.player1.value],
  (buttons) => {
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i] && !prevButtons[i]) {
        buttonCounters[i]++;
      }
    }
    prevButtons = [...buttons];
  },
);

export function resetCounters() {
  for (const key of Object.keys(touchCounters)) {
    touchCounters[key] = 0;
  }
  for (let i = 0; i < buttonCounters.length; i++) {
    buttonCounters[i] = 0;
  }
  prevZones.clear();
  prevButtons.fill(false);
}
