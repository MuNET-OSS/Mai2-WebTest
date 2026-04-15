import { defineComponent, PropType } from 'vue';
import styles from './index.module.sass';

const PATHS = [
  'm 163.7621,1.5368571 -1.26142,8.7741419 a 134.00911,134.00911 0 0 1 59.74105,24.585579 l 5.26273,-7.118945 A 142.875,142.875 0 0 0 163.7621,1.5368571 Z',
  'm 257.58273,58.107048 -6.91844,5.144388 a 134.00911,134.00911 0 0 1 24.76696,59.945174 l 8.79016,-1.14308 A 142.875,142.875 0 0 0 258.51962,59.022754 Z',
  'm 275.40386,162.73735 a 134.00911,134.00911 0 0 1 -24.70805,59.71832 l 6.78511,5.12837 a 142.875,142.875 0 0 0 26.41906,-62.55639 v -1.12861 z',
  'm 222.35955,250.76712 a 134.00911,134.00911 0 0 1 -59.81288,24.66516 l 1.17564,8.75192 a 142.875,142.875 0 0 0 62.41066,-25.61652 l 1.27951,-1.08882 z',
  'm 62.930009,250.42606 -5.122685,6.78615 a 142.875,142.875 0 0 0 63.995056,26.9229 l 1.16479,-8.73797 A 134.00911,134.00911 0 0 1 62.930009,250.42606 Z',
  'm 10.325985,162.60196 -8.4062055,1.16634 -0.142627,0.92449 a 142.875,142.875 0 0 0 26.5291305,62.93983 l 6.806819,-5.09685 A 134.00911,134.00911 0 0 1 10.325985,162.60196 Z',
  'M 28.317135,58.102397 A 142.875,142.875 0 0 0 1.6009359,121.8675 l 8.7395181,1.18184 A 134.00911,134.00911 0 0 1 35.118787,63.206478 Z',
  'M 122.06697,1.5575277 A 142.875,142.875 0 0 0 58.334424,28.142985 l 5.103564,6.805269 a 134.00911,134.00911 0 0 1 59.849062,-24.64294 z',
];

const BUTTON_COUNTER_POSITIONS = [
  { x: 196, y: 18 },
  { x: 270, y: 93 },
  { x: 269, y: 197 },
  { x: 195, y: 270 },
  { x: 91, y: 270 },
  { x: 17, y: 197 },
  { x: 16, y: 93 },
  { x: 90, y: 18 },
];

const COUNTER_TEXT_STYLE = 'font-size:5px;text-align:center;text-anchor:middle;white-space:pre';

export default defineComponent({
  props: {
    pressed: { type: Array as PropType<boolean[]>, required: true },
    counters: { type: Array as PropType<number[]> },
  },
  setup(props) {
    return () => (
      <svg
        viewBox="0 0 285.74999 285.75"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        {props.pressed.map((isPressed, index) => (
          <path
            class={isPressed ? styles.pressed : styles.idle}
            d={PATHS[index]}
          />
        ))}
        {props.counters && (
          <g>
            {BUTTON_COUNTER_POSITIONS.map((pos, i) => {
              const count = props.counters![i];
              return count > 0 ? (
                <g>
                  <circle cx={pos.x} cy={pos.y - 1.5} r={6} fill="oklch(0.81 0.09 var(--hue) / 0.5)" />
                  <text
                    style={COUNTER_TEXT_STYLE}
                    x={pos.x}
                    y={pos.y}
                    fill="#606266"
                  >
                    {count}
                  </text>
                </g>
              ) : null;
            })}
          </g>
        )}
      </svg>
    );
  },
});
