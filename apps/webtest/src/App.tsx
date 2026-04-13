import { defineComponent, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { tryAutoReconnectActiveDevice } from '@/devices/deviceMode';
import { modalShowing, GlobalElementsContainer as UIGlobalElementsContainer } from '@munet/ui';
import styles from './App.module.sass';

export default defineComponent({
  setup() {
    onMounted(() => tryAutoReconnectActiveDevice());

    return () => <div
      class={[styles.contentRoot, modalShowing.value && styles.modalOpen]}
    >
      <UIGlobalElementsContainer />
      <RouterView />
    </div>;
  },
});
