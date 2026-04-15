import { computed, defineComponent, PropType } from 'vue';
import styles from './index.module.sass';

const CLASS_NOT_SELECTED = styles.region;
const CLASS_SELECTED = `${styles.region} ${styles.selected}`;

// Counter text positions (from Noron reference — valueText coordinates for each zone)
const COUNTER_POSITIONS: Record<string, { x: number; y: number }> = {
  e8: { x: 84.722466, y: 95.169083 },
  e7: { x: 60.821415, y: 153.68095 },
  e6: { x: 84.722534, y: 210.88676 },
  e5: { x: 142.4507, y: 235.70206 },
  e4: { x: 200.04832, y: 210.88676 },
  e3: { x: 224.27589, y: 153.68095 },
  e2: { x: 200.04832, y: 95.169083 },
  e1: { x: 142.4507, y: 71.137421 },
  d8: { x: 58.364643, y: 66.696785 },
  d7: { x: 17.041054, y: 155.24825 },
  d6: { x: 51.834305, y: 241.18755 },
  d5: { x: 142.42686, y: 278.54111 },
  d4: { x: 232.33299, y: 241.18755 },
  d3: { x: 264.7262, y: 155.24825 },
  d2: { x: 227.63113, y: 66.696785 },
  d1: { x: 142.42686, y: 34.828709 },
  c2: { x: 128.35144, y: 153.41974 },
  c1: { x: 156, y: 153.41974 },
  b8: { x: 121.05595, y: 101.43822 },
  b7: { x: 88.926659, y: 132.78386 },
  b6: { x: 88.926659, y: 179.80232 },
  b5: { x: 121.05595, y: 210.36433 },
  b4: { x: 164.41742, y: 210.36433 },
  b3: { x: 194.97943, y: 180.06354 },
  b2: { x: 194.97943, y: 132.78386 },
  b1: { x: 164.41742, y: 101.43822 },
  a8: { x: 99.401733, y: 49.456676 },
  a7: { x: 34.622692, y: 113.85674 },
  a6: { x: 34.622692, y: 200.5797 },
  a5: { x: 99.401733, y: 264.43558 },
  a4: { x: 183.7634, y: 264.43558 },
  a3: { x: 248.84404, y: 200.5797 },
  a2: { x: 248.84404, y: 113.85674 },
  a1: { x: 183.7634, y: 49.456676 },
};

const COUNTER_TEXT_STYLE = 'font-size:9px;text-align:center;text-anchor:middle;white-space:pre;pointer-events:none';

export default defineComponent({
  props: {
    currentSelected: Array as PropType<string[]>,
    counters: Object as PropType<Record<string, number>>,
  },
  setup(props, { emit }) {
    const currentSelected = computed(() => props.currentSelected || [])

    return () => <svg
      viewBox="0 0 285.74999 285.75"
      version="1.1"
      id="svg1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="region-e">
        <g
          class={currentSelected.value.includes('e8') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            width="27.002966"
            height="27.002966"
            x="71.565834"
            y="71.494461"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="84.744858"
            y="84.57122"
          >
            <tspan
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E8
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e7') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect41"
            width="27.002966"
            height="27.002966"
            x="130.5323"
            y="44.030136"
            transform="rotate(45)"
          />
          <text
            style="font-size:14.1111px;text-align:center;baseline-shift:baseline;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="60.872746"
            y="143.0831"
            id="text130"
          >
            <tspan
              id="tspan130"
              style="font-size:14.1111px;text-align:center;baseline-shift:baseline;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E7
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e6') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect38"
            width="27.002966"
            height="27.002966"
            x="71.565903"
            y="186.82033"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="84.699448"
            y="200.28891"
            id="text138"
          >
            <tspan
              id="tspan138"
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E6
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e5') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect40"
            width="27.002966"
            height="27.002966"
            x="246.48149"
            y="44.538078"
            transform="rotate(45)"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="142.56818"
            y="225.88785"
            id="text126"
          >
            <tspan
              id="tspan126"
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E5
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e4') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect37"
            width="27.002966"
            height="27.002966"
            x="186.89169"
            y="186.82033"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="199.97563"
            y="200.28891"
            id="text136"
          >
            <tspan
              id="tspan136"
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E4
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e3') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect42"
            width="27.002966"
            height="27.002966"
            x="246.11208"
            y="-71.549637"
            transform="rotate(45)"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="224.43059"
            y="143.0831"
            id="text128"
          >
            <tspan
              id="tspan128"
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E3
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e2') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect36"
            width="27.002966"
            height="27.002966"
            x="186.89169"
            y="71.494461"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="200.1162"
            y="84.57122"
            id="text134"
          >
            <tspan
              id="tspan134"
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E2
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('e1') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <rect
            id="rect39"
            width="27.002966"
            height="27.002966"
            x="130.67084"
            y="-71.272575"
            transform="rotate(45)"
          />
          <text
            style="font-size:14.1111px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="142.86996"
            y="61.323204"
            id="text124"
          >
            <tspan
              id="tspan124"
              style="font-size:14.1111px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >E1
            </tspan>
          </text>
        </g>
      </g>
      <g id="region-d">
        <g
          class={currentSelected.value.includes('d8') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path4"
            d="M 55.80848,30.033826 A 142.875,142.875 0 0 0 30.07155,55.758871 L 68.82474,85.120386 V 68.450602 l 15.884818,-0.184485 z"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="53.060661"
            y="54.531647"
            id="text97"
          >
            <tspan
              id="tspan97"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D8
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d7') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path17"
            d="m 1.462443,124.19449 -0.139526,0.18087 A 142.875,142.875 0 0 0 0,142.875 142.875,142.875 0 0 0 1.301213,161.06976 l 47.767627,-6.63991 -11.297502,-11.88506 11.101648,-11.6241 z"
          />
          <text
            style="font-size:16.9333px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="17.141651"
            y="143.0831"
            id="text101"
          >
            <tspan
              id="tspan100"
              style="font-size:16.9333px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D7
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d6') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path15"
            d="m 68.529151,201.12158 -38.659656,28.53779 -0.0031,0.0584 a 142.875,142.875 0 0 0 25.657866,25.78603 l 29.396138,-38.57853 -16.652213,0.0651 z"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="58.069187"
            y="229.02242"
            id="text105"
          >
            <tspan
              id="tspan104"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D6
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d5') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path13"
            d="m 154.24071,236.32046 -11.42825,11.2975 -11.42772,-11.16727 -6.92258,47.54128 3.05098,0.65216 a 142.875,142.875 0 0 0 15.46056,1.10587 142.875,142.875 0 0 0 18.20612,-1.30224 z"
          />
          <text
            style="font-size:16.9333px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="142.59361"
            y="264.80869"
            id="text95"
          >
            <tspan
              id="tspan95"
              style="font-size:16.9333px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D5
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d4') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path11"
            d="m 217.02913,200.72987 0.0656,16.52199 -16.26102,0.0651 29.06024,38.33306 0.23358,-0.0729 a 142.875,142.875 0 0 0 25.71213,-25.80049 z"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="228.36163"
            y="229.02242"
            id="text103"
          >
            <tspan
              id="tspan102"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D4
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d3') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path9"
            d="m 284.42243,124.65131 -47.80225,6.92206 11.49335,11.42824 -11.10165,11.10165 47.01884,7.31376 0.45734,-0.89762 A 142.875,142.875 0 0 0 285.75,142.875 142.875,142.875 0 0 0 284.57126,124.88799 Z"
          />
          <text
            style="font-size:16.9333px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="264.93015"
            y="143.0831"
            id="text99"
          >
            <tspan
              id="tspan98"
              style="font-size:16.9333px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D3
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d2') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path7"
            d="m 229.81594,29.545484 -28.45976,38.879797 16.13028,-0.06563 V 84.424304 L 255.72082,55.31342 A 142.875,142.875 0 0 0 229.81594,29.545484 Z"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="231.88626"
            y="54.531647"
            id="text93"
          >
            <tspan
              id="tspan93"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D2
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('d1') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="circle4"
            d="M 142.79386,0 A 142.875,142.875 0 0 0 124.4446,1.312065 l 6.82231,48.021358 11.45151,-11.728483 11.544,11.913485 6.93497,-48.288009 A 142.875,142.875 0 0 0 142.79386,0 Z"
          />
          <text
            style="font-size:16.9333px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="142.8954"
            y="21.096291"
            id="text91"
          >
            <tspan
              id="tspan91"
              style="font-size:16.9333px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >D1
            </tspan>
          </text>
        </g>
      </g>
      <g id="region-c">
        <g
          class={currentSelected.value.includes('c2') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 131.02461,115.57428 h 10.51385 v 54.59366 h -9.86082 L 115.22118,153.97269 V 131.1818 Z"
            id="path20"
          />
          <text
            style="font-size:16.9333px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="128.77071"
            y="141.77702"
            id="text140"
          >
            <tspan
              id="tspan140"
              style="font-size:16.9333px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >C2
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('c1') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 154.40324,115.57428 h -10.51385 v 54.59366 h 9.86082 l 16.45646,-16.19525 V 131.1818 Z"
            id="path21"
          />
          <text
            style="font-size:16.9333px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="155.84676"
            y="141.77702"
            id="text142"
          >
            <tspan
              id="tspan142"
              style="font-size:16.9333px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >C1
            </tspan>
          </text>
        </g>
      </g>
      <g id="region-b">
        <g
          class={currentSelected.value.includes('b8') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 101.44215,78.677835 v 20.962403 l 7.4446,6.987472 h 19.00329 l 13.3872,-13.256602 0.0653,-10.448549 -14.75858,-14.236147 z"
            id="path19"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="120.22134"
            y="90.317932"
            id="text111"
          >
            <tspan
              id="tspan110"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B8
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b7') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 106.56267,108.30106 v 19.48648 l -13.414269,13.41427 h -10.22809 l -14.55714,-14.55714 10.17037,-24.8545 h 20.96413 z"
            id="path32"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="89.064484"
            y="120.0963"
            id="text113"
          >
            <tspan
              id="tspan112"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B7
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b6') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="M 106.56267,177.1733 V 157.68682 L 93.148401,144.27255 h -10.22809 l -14.55714,14.55714 10.17037,24.8545 h 20.96413 z"
            id="path33"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="88.996269"
            y="167.11476"
            id="text118"
          >
            <tspan
              id="tspan118"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B6
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b5') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 101.44215,207.20427 v -20.9624 l 7.4446,-6.98746 h 19.00329 l 13.3872,13.25659 0.0653,10.44855 -14.75858,14.23615 z"
            id="path34"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="120.22134"
            y="199.24405"
            id="text122"
          >
            <tspan
              id="tspan122"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B5
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b4') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 184.0191,207.27517 v -20.9624 l -7.44459,-6.98747 h -19.0033 l -13.3872,13.2566 -0.0653,10.44855 14.75858,14.23615 z"
            id="path35"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="162.18588"
            y="199.24405"
            id="text120"
          >
            <tspan
              id="tspan120"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B4
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b3') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 178.81735,177.1733 v -19.48648 l 13.41427,-13.41427 h 10.22809 l 14.55714,14.55714 -10.17037,24.8545 h -20.96413 z"
            id="path31"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="194.75407"
            y="167.37598"
            id="text115"
          >
            <tspan
              id="tspan114"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B3
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b2') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 178.81735,108.30106 v 19.48648 l 13.41427,13.41427 h 10.22809 l 14.55714,-14.55714 -10.17037,-24.8545 h -20.96413 z"
            id="path30"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="194.6745"
            y="120.0963"
            id="text109"
          >
            <tspan
              id="tspan108"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B2
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('b1') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="m 184.0191,78.606936 v 20.962403 l -7.44459,6.987471 h -19.0033 l -13.3872,-13.256601 -0.0653,-10.448549 14.75858,-14.236147 z"
            id="path19-6"
          />
          <text
            style="font-size:15.5222px;text-align:center;text-anchor:middle;white-space:pre;display:inline;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="162.18588"
            y="90.317932"
            id="text107"
          >
            <tspan
              id="tspan106"
              style="font-size:15.5222px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >B1
            </tspan>
          </text>
        </g>
      </g>
      <g id="region-a">
        <g
          class={currentSelected.value.includes('a8') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            d="M 122.06696,1.557528 A 142.875,142.875 0 0 0 58.334424,28.142985 l 30.161467,40.215633 h 12.282969 l 17.91673,-7.01921 10.34356,-9.789066 z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="97.941025"
            y="35.724258"
            id="text89"
          >
            <tspan
              id="tspan89"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A8
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a7') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path18"
            d="M 28.317135,58.102397 A 142.875,142.875 0 0 0 1.600936,121.8675 l 50.536967,6.83266 8.881628,-8.75037 7.444507,-17.56689 0.06511,-14.105601 z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="35.54908"
            y="100.12431"
            id="text87"
          >
            <tspan
              id="tspan87"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A7
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a6') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path16"
            d="M 51.811308,156.84624 1.91978,163.7683 1.777153,164.69279 a 142.875,142.875 0 0 0 26.52913,62.93983 L 68.59478,197.46495 v -12.93047 l -7.901844,-18.54616 z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="35.456062"
            y="186.84727"
            id="text85"
          >
            <tspan
              id="tspan85"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A6
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a5') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path14"
            d="m 88.316057,216.79452 -30.508733,40.41769 a 142.875,142.875 0 0 0 63.995056,26.9229 l 6.74067,-50.55763 -8.29355,-8.62015 -18.87275,-8.0977 z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="98.059883"
            y="250.70316"
            id="text83"
          >
            <tspan
              id="tspan83"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A5
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a4') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path12"
            d="m 183.7247,217.18623 -17.50178,7.24865 -9.27281,9.33845 6.77219,50.41088 a 142.875,142.875 0 0 0 62.41066,-25.61653 l 1.27951,-1.08882 -30.23536,-40.16189 z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="187.40811"
            y="250.70316"
            id="text81"
          >
            <tspan
              id="tspan81"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A4
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a3') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path10"
            d="m 233.74697,157.0421 -9.01186,8.88111 -7.70598,18.54615 -0.26097,12.3424 40.71276,30.77228 a 142.875,142.875 0 0 0 26.41906,-62.55638 v -1.12862 z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="249.89961"
            y="186.84727"
            id="text44"
          >
            <tspan
              id="tspan44"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A3
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a2') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="path8"
            d="m 257.58272,58.107048 -40.48797,30.105139 -0.0656,13.060703 7.51013,18.02371 9.07697,9.33845 50.60518,-6.58152 A 142.875,142.875 0 0 0 258.51962,59.022754 Z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="249.79109"
            y="100.12431"
            id="text42-6"
          >
            <tspan
              id="tspan42-8"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A2
            </tspan>
          </text>
        </g>
        <g
          class={currentSelected.value.includes('a1') ? CLASS_SELECTED : CLASS_NOT_SELECTED}
        >
          <path
            id="circle4-2"
            d="m 163.76209,1.536857 -7.13858,49.648132 9.66504,9.730156 16.97881,7.510136 14.23634,-0.06563 30.00075,-40.582019 A 142.875,142.875 0 0 0 163.76209,1.536857 Z"
          />
          <text
            style="font-size:21.1667px;text-align:center;text-anchor:middle;white-space:pre;opacity:1;fill:#a3c4ff;fill-opacity:1;stroke-width:0.264583"
            x="188.02306"
            y="35.724258"
            id="text42"
          >
            <tspan
              id="tspan42"
              style="font-size:21.1667px;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke-width:0.264583"
            >A1
            </tspan>
          </text>
        </g>
      </g>
      {props.counters && (
        <g style="pointer-events:none">
          {Object.entries(COUNTER_POSITIONS).map(([zone, pos]) => {
            const count = props.counters![zone];
            return count > 0 ? (
              <text
                style={COUNTER_TEXT_STYLE}
                x={pos.x}
                y={pos.y}
                fill="#555555"
              >
                {count}
              </text>
            ) : null;
          })}
        </g>
      )}
    </svg>;
  },
});
