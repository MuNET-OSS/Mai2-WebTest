import { computed, defineComponent } from 'vue';
import { useWindowSize } from '@vueuse/core';
import DefaultLayout from './DefaultLayout';
import CabinetLayout from './CabinetLayout';

export default defineComponent({
  setup() {
    const { width, height } = useWindowSize();
    const isCabinetScreen = computed(() => height.value >= width.value * 1.42);

    return () => isCabinetScreen.value ? <CabinetLayout /> : <DefaultLayout />;
  },
});
