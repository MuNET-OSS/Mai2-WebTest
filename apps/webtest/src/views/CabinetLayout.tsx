import { defineComponent, onMounted, onUnmounted } from 'vue';
import { activeDevice, deviceMode } from '@/devices/deviceMode';
import { touchCounters, buttonCounters, resetCounters } from '@/pressCounter';
import Display from '@/components/Display';
import ButtonRing from '@/components/ButtonRing';
import ConnectionPanel from '@/components/ConnectionPanel';
import LedControl from '@/components/LedControl';
import PdxSettings from '@/components/PdxSettings';
import { theme } from '@munet/ui';

export default defineComponent({
  setup() {
    let savedFontSize: string;

    onMounted(() => {
      savedFontSize = document.documentElement.style.fontSize;
      document.documentElement.style.fontSize = '1.5vw';
    });

    onUnmounted(() => {
      document.documentElement.style.fontSize = savedFontSize;
    });
  },
  render() {
    const device = activeDevice.value;
    const hidConnected = device.buttons.connected.value;
    const showLightSection = device.lighting.available.value;
    const showPdxSettings = deviceMode.value === 'pdx';

    return (
      <div class="relative h-100vh w-100vw overflow-hidden">
        <div class="absolute left-0 top-0 right-0 h-42vw overflow-y-auto p-3 flex flex-col gap-3 cst">
          <ConnectionPanel />

          <div class="flex flex-col gap-3 flex-1">
            {hidConnected && (
              <div class="flex gap-3 flex-wrap justify-center">
                {device.buttons.systemButtons.map(name => (
                  <div class={["flex items-center gap-1.5 px-3 py-1.5 rounded text-sm", device.buttons.states.value[name] ? theme.value.listItemAlt : theme.value.listItem]}>
                    <span
                      class={[
                        "w-2 h-2 rounded-full flex-shrink-0",
                        device.buttons.states.value[name] ? 'bg-green-500' : 'bg-gray-500'
                      ]}
                    />
                    {name}
                  </div>
                ))}
                <button onClick={resetCounters} class="text-xs self-end">
                  重置计数
                </button>
              </div>
            )}

            {showLightSection && <LedControl />}

            {showPdxSettings && <PdxSettings />}

          </div>
        </div>

        <div class="absolute left-0 bottom-0 right-0 h-100vw">
          <Display currentSelected={device.touch.zones.value} counters={touchCounters} class="h-full w-full" />
          {hidConnected && (
            <ButtonRing
              pressed={device.buttons.player1.value}
              counters={buttonCounters}
              class="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          )}
        </div>
      </div>
    );
  },
});
