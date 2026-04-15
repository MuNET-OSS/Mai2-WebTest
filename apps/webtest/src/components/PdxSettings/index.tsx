import { defineComponent } from 'vue';
import { Range } from '@munet/ui';
import { pdxRadius, pdxAExtra, pdxBExtra, pdxCExtra, pdxDExtra, pdxEExtra } from '@/devices/pdxUsb';
import styles from './index.module.sass';

const RADIUS_ITEMS = [
  { label: '基础半径', ref: pdxRadius, min: 0, max: 100 },
  { label: 'A 区额外半径', ref: pdxAExtra, min: -50, max: 100 },
  { label: 'B 区额外半径', ref: pdxBExtra, min: -50, max: 100 },
  { label: 'C 区额外半径', ref: pdxCExtra, min: -50, max: 100 },
  { label: 'D 区额外半径', ref: pdxDExtra, min: -50, max: 100 },
  { label: 'E 区额外半径', ref: pdxEExtra, min: -50, max: 100 },
] as const;

export default defineComponent({
  setup() {
    return () => (
      <div class={styles.container}>
        {RADIUS_ITEMS.map(item => (
          <div class={styles.row} key={item.label}>
            <span class={styles.label}>{item.label}</span>
            <div class={styles.slider}>
              {/* @ts-ignore */}
              <Range min={item.min} max={item.max} v-model={item.ref.value} />
            </div>
            <span class={styles.value}>{item.ref.value}</span>
          </div>
        ))}
      </div>
    );
  },
});
