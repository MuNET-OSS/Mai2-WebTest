import { defineComponent, ref, watch } from 'vue';
import { debounce } from 'perfect-debounce';
import { ledConnected, setAllLedColor, setFrameLightBrightness } from '@/devices/ledSerial';
import { io4Connected, setTopLightColor } from '@/devices/io4';
import { Range } from '@munet/ui';
import styles from './index.module.sass';

const PRESET_COLORS: { name: string, rgb: [number, number, number] }[] = [
  { name: '红', rgb: [255, 0, 0] },
  { name: '绿', rgb: [0, 255, 0] },
  { name: '蓝', rgb: [0, 0, 255] },
  { name: '青', rgb: [0, 255, 255] },
  { name: '品红', rgb: [255, 0, 255] },
  { name: '黄', rgb: [255, 255, 0] },
  { name: '白', rgb: [255, 255, 255] },
  { name: '橙', rgb: [255, 127, 0] },
  { name: '关', rgb: [0, 0, 0] },
];

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export default defineComponent({
  setup() {
    const topColor = ref('#ff0000');
    const buttonColor = ref('#ff0000');
    const frameBrightness = ref(255);

    const debouncedTopSend = debounce(async (hex: string) => {
      const [r, g, b] = hexToRgb(hex);
      await setTopLightColor(r, g, b);
    }, 50);

    const debouncedButtonSend = debounce(async (hex: string) => {
      const [r, g, b] = hexToRgb(hex);
      await setAllLedColor(r, g, b);
    }, 50);

    const debouncedFrameSend = debounce(async (value: number) => {
      await setFrameLightBrightness(value);
    }, 50);

    watch(topColor, v => { if (io4Connected.value) debouncedTopSend(v); });
    watch(buttonColor, v => { if (ledConnected.value) debouncedButtonSend(v); });
    watch(frameBrightness, v => { if (ledConnected.value) debouncedFrameSend(v); });

    const renderPresetColors = (currentColor: typeof topColor) => (
      <div class={styles.presets}>
        {PRESET_COLORS.map(preset => {
          const hex = rgbToHex(...preset.rgb);
          return (
            <div
              class={[styles.presetSwatch, currentColor.value === hex && styles.presetSwatchActive]}
              style={{ backgroundColor: hex }}
              title={preset.name}
              onClick={() => { currentColor.value = hex; }}
            />
          );
        })}
      </div>
    );

    const renderColorSection = (label: string, color: typeof topColor) => (
      <div class={styles.section}>
        <div class={styles.label}>{label}</div>
        <div class={styles.colorRow}>
          <input
            type="color"
            value={color.value}
            onInput={(e: Event) => { color.value = (e.target as HTMLInputElement).value; }}
            class="w-8 h-8 p-0 border-none rounded bg-transparent cursor-pointer"
          />
          {renderPresetColors(color)}
        </div>
      </div>
    );

    return () => {
      const showTop = io4Connected.value;
      const showSerial = ledConnected.value;

      if (!showTop && !showSerial) return null;

      return (
        <div class={styles.container}>
          {showTop && renderColorSection('顶灯', topColor)}

          {showSerial && (
            <div class={styles.section}>
              <div class={styles.label}>框体灯亮度</div>
              <div class={styles.brightnessRow}>
                <div class="flex flex-col w-0 grow justify-center">
                  {/* @ts-ignore */}
                  <Range min={0} max={255} v-model={frameBrightness.value} />
                </div>
                <span class={styles.brightnessValue}>{frameBrightness.value}</span>
              </div>
            </div>
          )}

          {showSerial && renderColorSection('按键灯', buttonColor)}
        </div>
      );
    };
  },
});
