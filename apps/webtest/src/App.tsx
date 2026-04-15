import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { RouterView } from 'vue-router';
import { tryAutoReconnectActiveDevice } from '@/devices/deviceMode';
import { modalShowing, GlobalElementsContainer as UIGlobalElementsContainer } from '@munet/ui';
import styles from './App.module.sass';

const isFullscreen = ref(!!document.fullscreenElement);

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

export default defineComponent({
  setup() {
    onMounted(() => {
      tryAutoReconnectActiveDevice();
      document.addEventListener('fullscreenchange', onFullscreenChange);
    });

    onUnmounted(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    });

    return () => <div
      class={[styles.contentRoot, modalShowing.value && styles.modalOpen]}
    >
      <UIGlobalElementsContainer />
      <RouterView />
      <button
        class="absolute top-8px right-8px rounded-full p-0 w-32px h-32px flex items-center justify-center text-16px"
        onClick={toggleFullscreen}
        title={isFullscreen.value ? '退出全屏' : '全屏'}
      >
        <div class={isFullscreen.value ? 'i-mingcute:fullscreen-exit-2-line' : 'i-mingcute:fullscreen-2-line'} />
      </button>
    </div>;
  },
});
