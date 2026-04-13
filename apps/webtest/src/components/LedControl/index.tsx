import { defineComponent, ref } from 'vue';
import { ledConnected, setAllLedColor } from '@/devices/ledSerial';
import { Button, TextInput } from '@munet/ui';
import styles from './index.module.sass';

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
}

export default defineComponent({
  setup() {
    const color = ref('#ff0000');
    const sending = ref(false);

    const handleSend = async () => {
      if (!ledConnected.value || sending.value) return;
      sending.value = true;
      try {
        const [r, g, b] = hexToRgb(color.value);
        await setAllLedColor(r, g, b);
      } finally {
        sending.value = false;
      }
    };

    return () => (
      <div class={styles.container}>
        <div class={styles.label}>LED</div>
        <TextInput
          type="color"
          v-model:value={color.value}
          disabled={!ledConnected.value}
          class="w-12 h-8 p-1 cursor-pointer"
        />
        <Button
          onClick={handleSend}
          ing={sending.value}
          disabled={!ledConnected.value || sending.value}
        >
          发送
        </Button>
      </div>
    );
  },
});
